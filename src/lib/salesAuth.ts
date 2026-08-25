import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const SALES_COOKIE_NAME = 'khf_sales_token';
const JWT_SECRET = process.env.JWT_SECRET || 'kamadhenu-luxury-secret-key-2026-super-secure';

export interface SalespersonPayload {
  id: string;
  applicationNo: string;
  fullName: string;
  mobileNumber: string;
  workingTerritory?: string;
  role: 'SALES_EXECUTIVE';
  iat: number;
  exp: number;
}

export function signSalesJwt(
  payload: Omit<SalespersonPayload, 'iat' | 'exp'>,
  expiresInSeconds = 30 * 24 * 60 * 60 // 30 days session for field sales
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: SalespersonPayload = { ...payload, iat, exp };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signatureInput = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifySalesJwt(token: string): SalespersonPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const signatureInput = `${header}.${body}`;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload: SalespersonPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null;
    }

    if (payload.role !== 'SALES_EXECUTIVE') {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

export async function getSalesSessionFromRequest(req: NextRequest): Promise<SalespersonPayload | null> {
  const token = req.cookies.get(SALES_COOKIE_NAME)?.value;
  if (!token) return null;
  const verified = verifySalesJwt(token);
  if (!verified) return null;

  // Optional: Verify salesperson is still active in database
  try {
    const agent = await prisma.application.findUnique({
      where: { id: verified.id },
      select: { id: true, isAuthActive: true, role: true, status: true },
    });
    if (!agent || agent.isAuthActive === false || (agent.role !== 'SALES_EXECUTIVE' && agent.status !== 'HIRED')) {
      return null;
    }
  } catch (e) {
    // If DB check fails, fallback to valid verified JWT
  }

  return verified;
}

export async function getAnySessionFromRequest(req: NextRequest): Promise<{
  type: 'ADMIN' | 'SALES' | 'NONE';
  admin?: any;
  sales?: SalespersonPayload;
}> {
  const admin = getAdminSessionFromRequest(req);
  if (admin) {
    return { type: 'ADMIN', admin };
  }

  const sales = await getSalesSessionFromRequest(req);
  if (sales) {
    return { type: 'SALES', sales };
  }

  return { type: 'NONE' };
}
