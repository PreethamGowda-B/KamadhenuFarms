import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    application: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    customerSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';
process.env.ORDER_TOKEN_SECRET = 'test-order-token-secret-key-kamadhenu-2026-strong';
process.env.ADMIN_EMAIL = 'admin@kamadhenuhoneyfarms.in';

import {
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  checkRateLimitDistributed,
  getClientIp,
  getJwtSecret,
  resetRateLimit,
  revokeAdminToken,
  revokeAdminTokenDistributed,
  signJwt,
  verifyAdminPassword,
  verifyJwt,
} from '@/lib/auth';
import {
  signSalesJwt,
  verifySalesJwt,
  getSalesSessionFromRequest,
  SALES_COOKIE_NAME,
} from '@/lib/salesAuth';
import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from '@/lib/customerAuth';
import { middleware } from '@/middleware';

describe('Authentication, JWT, Rate Limiting & Middleware Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs admin JWT with HS256/jti and rejects tampered or alg=none tokens', () => {
    const token = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, 3600);
    const decoded = verifyJwt(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe('admin@kamadhenuhoneyfarms.in');
    expect(decoded?.jti).toBeTruthy();

    // Tampered payload
    const [h, p, s] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ email: 'attacker@evil.com', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 9999 })
    ).toString('base64url');
    expect(verifyJwt(`${h}.${tamperedPayload}.${s}`)).toBeNull();

    // alg: none attack
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    expect(verifyJwt(`${noneHeader}.${p}.`)).toBeNull();
  });

  it('revokes admin JWT immediately upon logout', () => {
    const token = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, 3600);
    expect(verifyJwt(token)).not.toBeNull();
    revokeAdminToken(token);
    expect(verifyJwt(token)).toBeNull();
  });

  it('requires salted scrypt ADMIN_PASSWORD_HASH and rejects plaintext ADMIN_PASSWORD fallback', () => {
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = 'SuperSecretTestAdminPassword!99';
    // Plaintext ADMIN_PASSWORD must no longer be accepted without ADMIN_PASSWORD_HASH
    expect(verifyAdminPassword('SuperSecretTestAdminPassword!99')).toBe(false);
    expect(verifyAdminPassword('')).toBe(false);

    const salt = '0123456789abcdef0123456789abcdef';
    const derived = crypto.scryptSync('ScryptAdminPass#2026', salt, 64).toString('hex');
    process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt}:${derived}`;
    try {
      expect(verifyAdminPassword('ScryptAdminPass#2026')).toBe(true);
      expect(verifyAdminPassword('SuperSecretTestAdminPassword!99')).toBe(false);
    } finally {
      delete process.env.ADMIN_PASSWORD_HASH;
      delete process.env.ADMIN_PASSWORD;
    }
  });

  it('rejects weak JWT_SECRET or ORDER_TOKEN_SECRET under 32 chars and verifies Upstash distributed rate-limit/revocation', async () => {
    const prevJwt = process.env.JWT_SECRET;
    const prevOrder = process.env.ORDER_TOKEN_SECRET;
    try {
      process.env.JWT_SECRET = 'too-short';
      expect(() => getJwtSecret()).toThrow(/at least 32/i);

      process.env.JWT_SECRET = prevJwt;
      process.env.ORDER_TOKEN_SECRET = 'weak-short-secret';
      expect(() => signOrderAccessToken('KHF-ORD-WEAK', 'cust_1')).toThrow(/at least 32/i);
    } finally {
      process.env.JWT_SECRET = prevJwt;
      process.env.ORDER_TOKEN_SECRET = prevOrder;
    }

    // Verify distributed Upstash REST pipeline integration for rate limiting & admin JTI revocation
    const prevFetch = globalThis.fetch;
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-test-token';
    const fetchSpy = vi.fn(async (_url: any, init?: any) => {
      const body = JSON.parse(String(init?.body || '[]'));
      const firstCmd = body?.[0]?.[0];
      if (firstCmd === 'INCR') {
        return new Response(JSON.stringify([{ result: 6 }, { result: 60000 }]), { status: 200 });
      }
      if (firstCmd === 'GET') {
        return new Response(JSON.stringify([{ result: '1' }]), { status: 200 });
      }
      return new Response(JSON.stringify([{ result: 'OK' }]), { status: 200 });
    });
    globalThis.fetch = fetchSpy as any;

    try {
      const rl = await checkRateLimitDistributed('admin_login:198.51.100.7', 5, 60_000);
      expect(rl.allowed).toBe(false);
      expect(rl.distributed).toBe(true);

      const adminToken = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, 3600);
      await revokeAdminTokenDistributed(adminToken);

      const revokedReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/admin/orders', {
        headers: { cookie: `${ADMIN_COOKIE_NAME}=${adminToken}` },
      });
      expect((await middleware(revokedReq)).status).toBe(403);
      expect(fetchSpy).toHaveBeenCalled();
    } finally {
      globalThis.fetch = prevFetch;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });

  it('partitions rate limits by endpoint prefix and resets cleanly', () => {
    const keyA = `admin_login:10.0.0.5_${Date.now()}`;
    const keyB = `sales_login:10.0.0.5_${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(keyA, 3, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(keyA, 3, 60_000).allowed).toBe(false);
    // Distinct partition still allowed
    expect(checkRateLimit(keyB, 3, 60_000).allowed).toBe(true);

    resetRateLimit(keyA);
    expect(checkRateLimit(keyA, 3, 60_000).allowed).toBe(true);
  });

  it('extracts primary client IP from x-forwarded-for safely', () => {
    const req = new NextRequest('https://kamadhenuhoneyfarms.in/api/admin/login', {
      headers: { 'x-forwarded-for': '203.0.113.19, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('203.0.113.19');
  });

  it('rejects sales session fail-closed when candidate is deactivated in DB', async () => {
    const salesToken = signSalesJwt({
      id: 'cand_1',
      applicationNo: 'KHF-2026-001',
      fullName: 'Ravi Kumar',
      mobileNumber: '9876543210',
      role: 'SALES_EXECUTIVE',
    });
    expect(verifySalesJwt(salesToken)?.id).toBe('cand_1');

    prismaMock.application.findUnique.mockResolvedValue({
      status: 'HIRED',
      isAuthActive: false,
    });

    const req = new NextRequest('https://kamadhenuhoneyfarms.in/api/sales/dashboard', {
      headers: { cookie: `${SALES_COOKIE_NAME}=${salesToken}` },
    });
    const session = await getSalesSessionFromRequest(req);
    expect(session).toBeNull();
  });

  it('scopes HMAC order access token to specific orderNumber and rejects mismatch/tampering', () => {
    const token = signOrderAccessToken('KHF-ORD-261111-AABBCCDD', 'cust_123');
    const valid = verifyOrderAccessToken(token, 'KHF-ORD-261111-AABBCCDD');
    expect(valid).not.toBeNull();
    expect(valid?.customerId).toBe('cust_123');

    // Wrong order number rejected
    expect(verifyOrderAccessToken(token, 'KHF-ORD-261111-FFFFFFFF')).toBeNull();
    // Tampered token rejected
    expect(verifyOrderAccessToken(`${token}x`, 'KHF-ORD-261111-AABBCCDD')).toBeNull();
  });

  it('middleware blocks x-middleware-subrequest spoofing (403) and enforces strict CORS allowlist', async () => {
    const spoofReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/products', {
      headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware' },
    });
    const spoofRes = await middleware(spoofReq);
    expect(spoofRes.status).toBe(403);

    const evilCorsReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/products', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil-attacker.example' },
    });
    const evilCorsRes = await middleware(evilCorsReq);
    expect(evilCorsRes.status).toBe(403);
    expect(evilCorsRes.headers.get('access-control-allow-origin')).toBeNull();

    const goodCorsReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/products', {
      headers: { origin: 'https://admin.kamadhenuhoneyfarms.in' },
    });
    const goodCorsRes = await middleware(goodCorsReq);
    expect(goodCorsRes.headers.get('access-control-allow-origin')).toBe(
      'https://admin.kamadhenuhoneyfarms.in'
    );
    expect(goodCorsRes.headers.get('vary')).toBe('Origin');
  });

  it('middleware blocks unauthenticated admin API calls (except /api/admin/login)', async () => {
    const adminApiReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/admin/orders');
    const res = await middleware(adminApiReq);
    expect(res.status).toBe(403);

    const adminToken = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, 3600);
    const authedReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/admin/orders', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${adminToken}` },
    });
    const authedRes = await middleware(authedReq);
    expect(authedRes.status).toBe(200);
  });
});
