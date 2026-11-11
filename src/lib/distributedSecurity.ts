/**
 * Edge & Node Runtime compatible distributed rate limiter and token revocation store.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured, all rate-limit
 * counters and revoked admin JWT JTIs are persisted in shared Upstash Redis via REST API.
 * When unset (local dev or isolated unit tests), falls back safely to a process-wide
 * globalThis in-memory store with zero external dependencies.
 */

export interface RateLimitResult {
  allowed: boolean;
  remainingMs?: number;
  distributed: boolean;
}

interface SecurityFallbackStore {
  rateLimitBuckets: Map<string, { count: number; expiresAt: number }>;
  revokedAdminJtis: Map<string, number>;
}

const globalRef = globalThis as typeof globalThis & {
  __khfSecurityStore?: SecurityFallbackStore;
};

export function getFallbackSecurityStore(): SecurityFallbackStore {
  if (!globalRef.__khfSecurityStore) {
    globalRef.__khfSecurityStore = {
      rateLimitBuckets: new Map(),
      revokedAdminJtis: new Map(),
    };
  }
  return globalRef.__khfSecurityStore;
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isDistributedSecurityConfigured(): boolean {
  return getUpstashConfig() !== null;
}

async function runUpstashPipeline(commands: Array<Array<string | number>>): Promise<Array<{ result?: unknown; error?: string }> | null> {
  const cfg = getUpstashConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Upstash pipeline HTTP ${res.status}`);
  }

  return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

export function checkRateLimitLocal(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const { rateLimitBuckets } = getFallbackSecurityStore();
  const now = Date.now();

  if (rateLimitBuckets.size > 2000) {
    for (const [k, v] of rateLimitBuckets.entries()) {
      if (now > v.expiresAt) rateLimitBuckets.delete(k);
    }
  }

  const entry = rateLimitBuckets.get(key);
  if (!entry || now > entry.expiresAt) {
    rateLimitBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, distributed: false };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remainingMs: entry.expiresAt - now, distributed: false };
  }

  entry.count += 1;
  return { allowed: true, distributed: false };
}

export function resetRateLimitLocal(key: string): void {
  getFallbackSecurityStore().rateLimitBuckets.delete(key);
}

/**
 * Shared rate limiter across serverless/edge instances via Upstash Redis REST API.
 * Falls back cleanly to process memory when Upstash is unconfigured or unreachable.
 */
export async function checkRateLimitDistributed(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  if (!isDistributedSecurityConfigured()) {
    return checkRateLimitLocal(key, maxAttempts, windowMs);
  }

  const redisKey = `khf:rl:${key}`;
  try {
    const results = await runUpstashPipeline([
      ['INCR', redisKey],
      ['PTTL', redisKey],
    ]);

    const count = Number(results?.[0]?.result ?? 0);
    let pttl = Number(results?.[1]?.result ?? -1);

    if (count === 1 || pttl < 0) {
      await runUpstashPipeline([['PEXPIRE', redisKey, Math.max(1000, Math.round(windowMs))]]);
      pttl = windowMs;
    }

    if (count > maxAttempts) {
      return {
        allowed: false,
        remainingMs: pttl > 0 ? pttl : windowMs,
        distributed: true,
      };
    }

    return { allowed: true, distributed: true };
  } catch (err) {
    console.warn('⚠️ [Distributed RateLimit] Upstash unavailable, falling back to local store:', err);
    return checkRateLimitLocal(key, maxAttempts, windowMs);
  }
}

export async function resetRateLimitDistributed(key: string): Promise<void> {
  resetRateLimitLocal(key);
  if (!isDistributedSecurityConfigured()) return;

  try {
    await runUpstashPipeline([['DEL', `khf:rl:${key}`]]);
  } catch (err) {
    console.warn('⚠️ [Distributed RateLimit] Reset warning:', err);
  }
}

export function revokeAdminJtiLocal(jti: string, expMs: number): void {
  const { revokedAdminJtis } = getFallbackSecurityStore();
  if (revokedAdminJtis.size > 2000) {
    const now = Date.now();
    for (const [k, until] of revokedAdminJtis.entries()) {
      if (now >= until) revokedAdminJtis.delete(k);
    }
  }
  revokedAdminJtis.set(jti, expMs);
}

export function isAdminJtiRevokedLocal(jti: string | undefined): boolean {
  if (!jti) return false;
  const revokedUntil = getFallbackSecurityStore().revokedAdminJtis.get(jti);
  return Boolean(revokedUntil && Date.now() < revokedUntil);
}

export async function revokeAdminJtiDistributed(jti: string, expMs: number): Promise<void> {
  revokeAdminJtiLocal(jti, expMs);
  if (!isDistributedSecurityConfigured()) return;

  const ttlSeconds = Math.max(60, Math.ceil((expMs - Date.now()) / 1000));
  try {
    await runUpstashPipeline([['SET', `khf:revoked_jti:${jti}`, '1', 'EX', ttlSeconds]]);
  } catch (err) {
    console.warn('⚠️ [Distributed JTI Revoke] Upstash revoke failed:', err);
  }
}

export async function isAdminJtiRevokedDistributed(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  if (isAdminJtiRevokedLocal(jti)) return true;
  if (!isDistributedSecurityConfigured()) return false;

  try {
    const results = await runUpstashPipeline([['GET', `khf:revoked_jti:${jti}`]]);
    const val = results?.[0]?.result;
    return val === '1' || val === 1;
  } catch (err) {
    console.warn('⚠️ [Distributed JTI Check] Upstash check failed:', err);
    return false;
  }
}

const idempotencyFallbackMap = new Map<string, number>();

export async function claimCheckoutIdempotencyKey(
  key: string,
  ttlSeconds = 120
): Promise<boolean> {
  const clean = key.trim();
  if (!clean) return true;

  const now = Date.now();
  if (idempotencyFallbackMap.size > 1000) {
    for (const [k, exp] of idempotencyFallbackMap.entries()) {
      if (now >= exp) idempotencyFallbackMap.delete(k);
    }
  }

  const localExp = idempotencyFallbackMap.get(clean);
  if (localExp && now < localExp) {
    return false;
  }

  if (!isDistributedSecurityConfigured()) {
    idempotencyFallbackMap.set(clean, now + ttlSeconds * 1000);
    return true;
  }

  try {
    const results = await runUpstashPipeline([
      ['SET', `khf:idem:${clean}`, '1', 'EX', ttlSeconds, 'NX'],
    ]);
    const ok = results?.[0]?.result === 'OK';
    if (ok) {
      idempotencyFallbackMap.set(clean, now + ttlSeconds * 1000);
    }
    return ok;
  } catch (err) {
    console.warn('⚠️ [Checkout Idempotency] Upstash claim failed, using local fallback:', err);
    idempotencyFallbackMap.set(clean, now + ttlSeconds * 1000);
    return true;
  }
}

export async function releaseCheckoutIdempotencyKey(key: string): Promise<void> {
  const clean = key.trim();
  if (!clean) return;
  idempotencyFallbackMap.delete(clean);
  if (!isDistributedSecurityConfigured()) return;

  try {
    await runUpstashPipeline([['DEL', `khf:idem:${clean}`]]);
  } catch {
    // Non-fatal
  }
}
