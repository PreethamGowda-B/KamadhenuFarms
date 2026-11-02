import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'khf_admin_token';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
  }
  return secret.trim();
}

export interface AdminPayload {
  email: string;
  role: 'ADMIN';
  iat: number;
  exp: number;
}

// In-memory rate limiting map for login protection
const loginAttempts = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry) {
    loginAttempts.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return { allowed: true };
  }

  if (now > entry.expiresAt) {
    loginAttempts.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return { allowed: true };
  }

  if (entry.count >= 5) {
    return { allowed: false, remainingMs: entry.expiresAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}

// Helper to create a signed token (Base64url JSON + HMAC signature)
export function signJwt(payload: Omit<AdminPayload, 'iat' | 'exp'>, expiresInSeconds = 8 * 60 * 60): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: AdminPayload = { ...payload, iat, exp };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signatureInput = `${header}.${body}`;
  const secret = getJwtSecret();
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): AdminPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const signatureInput = `${header}.${body}`;
    const secret = getJwtSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

    // Constant-time signature comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: AdminPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null;
    }

    if (payload.role !== 'ADMIN') {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

// Password Verification against configured environment password using timing-safe comparison
export function verifyAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword || !password) {
    return false;
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expectedPassword);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function getAdminSessionFromRequest(req: NextRequest): AdminPayload | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}
