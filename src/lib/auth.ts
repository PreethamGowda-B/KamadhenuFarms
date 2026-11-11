import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import {
  checkRateLimitDistributed,
  checkRateLimitLocal,
  isAdminJtiRevokedDistributed,
  isAdminJtiRevokedLocal,
  resetRateLimitDistributed,
  resetRateLimitLocal,
  revokeAdminJtiDistributed,
  revokeAdminJtiLocal,
} from '@/lib/distributedSecurity';

export const ADMIN_COOKIE_NAME = 'khf_admin_token';
const MIN_HMAC_SECRET_LENGTH = 32;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
  }
  if (secret.length < MIN_HMAC_SECRET_LENGTH) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: JWT_SECRET must be at least ${MIN_HMAC_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

export interface AdminPayload {
  email: string;
  role: 'ADMIN';
  jti?: string;
  iat: number;
  exp: number;
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remainingMs?: number } {
  return checkRateLimitLocal(key, maxAttempts, windowMs);
}

export function resetRateLimit(key: string): void {
  resetRateLimitLocal(key);
}

export { checkRateLimitDistributed, resetRateLimitDistributed };

// Helper to create a signed token (Base64url JSON + HMAC signature)
export function signJwt(payload: Omit<AdminPayload, 'iat' | 'exp'>, expiresInSeconds = 8 * 60 * 60): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const jti = payload.jti || crypto.randomUUID();
  const fullPayload: AdminPayload = { ...payload, jti, iat, exp };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signatureInput = `${header}.${body}`;
  const secret = getJwtSecret();
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function revokeAdminToken(token: string | undefined): void {
  if (!token) return;
  const payload = verifyJwt(token);
  if (payload?.jti) {
    const expMs = payload.exp ? payload.exp * 1000 : Date.now() + 30 * 24 * 3600 * 1000;
    revokeAdminJtiLocal(payload.jti, expMs);
  }
}

export async function revokeAdminTokenDistributed(token: string | undefined): Promise<void> {
  if (!token) return;
  const payload = verifyJwt(token);
  if (payload?.jti) {
    const expMs = payload.exp ? payload.exp * 1000 : Date.now() + 30 * 24 * 3600 * 1000;
    await revokeAdminJtiDistributed(payload.jti, expMs);
  }
}

export function verifyJwt(token: string): AdminPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, signature] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    const signatureInput = `${headerB64}.${bodyB64}`;
    const secret = getJwtSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

    // Constant-time signature comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: AdminPayload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null;
    }

    if (payload.role !== 'ADMIN') {
      return null;
    }

    if (payload.jti && isAdminJtiRevokedLocal(payload.jti)) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

export async function verifyJwtAsync(token: string): Promise<AdminPayload | null> {
  const payload = verifyJwt(token);
  if (!payload) return null;
  if (payload.jti && (await isAdminJtiRevokedDistributed(payload.jti))) {
    return null;
  }
  return payload;
}

// Strict salted scrypt verification against ADMIN_PASSWORD_HASH (no plaintext password fallback)
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;

  const hashedEnv = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!hashedEnv || !hashedEnv.includes(':')) {
    return false;
  }

  const parts = hashedEnv.split(':');
  const [salt, storedHash] =
    parts.length === 3 && parts[0] === 'scrypt' ? [parts[1], parts[2]] : parts.length === 2 ? parts : ['', ''];

  if (!salt || !storedHash || !/^[0-9a-f]+$/i.test(storedHash)) {
    return false;
  }

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(derived, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && a.length === 64 && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getAdminSessionFromRequest(req: NextRequest): AdminPayload | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export async function getAdminSessionFromRequestAsync(req: NextRequest): Promise<AdminPayload | null> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwtAsync(token);
}
