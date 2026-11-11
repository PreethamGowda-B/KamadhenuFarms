import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest, getJwtSecret } from '@/lib/auth';

export const SALES_COOKIE_NAME = 'khf_sales_token';

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
  const secret = getJwtSecret();
  const signature = crypto.createHmac('sha256', secret).update(signatureInput).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifySalesJwt(token: string): SalespersonPayload | null {
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

    const payload: SalespersonPayload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
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

  // Verify salesperson is still active and hired in database (fail closed)
  try {
    const agent = await prisma.application.findUnique({
      where: { id: verified.id },
      select: { id: true, isAuthActive: true, role: true, status: true },
    });
    if (!agent || agent.isAuthActive === false || (agent.role !== 'SALES_EXECUTIVE' && agent.status !== 'HIRED')) {
      return null;
    }
  } catch (e) {
    console.error('Failed verifying salesperson status in database:', e);
    return null;
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
