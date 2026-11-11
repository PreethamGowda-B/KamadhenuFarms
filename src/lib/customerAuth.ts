import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';

export const CUSTOMER_COOKIE_NAME = 'khf_customer_session';
export const ORDER_ACCESS_COOKIE_NAME = 'khf_order_token';
export const CUSTOMER_SESSION_DURATION_SECONDS = 90 * 24 * 60 * 60; // 90 days
export const ORDER_TOKEN_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

function getOrderTokenHmacSecret(): Buffer {
  const configured = process.env.ORDER_TOKEN_SECRET?.trim();
  if (configured && configured.length < 32) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: ORDER_TOKEN_SECRET must be at least 32 characters.'
    );
  }
  const raw = configured || getJwtSecret();
  return crypto.createHash('sha256').update(`khf-order-access-v1:${raw}`).digest();
}

export function signOrderAccessToken(
  orderNumber: string,
  customerId: string,
  expiresInSeconds = ORDER_TOKEN_DURATION_SECONDS
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const payloadB64 = Buffer.from(
    JSON.stringify({ orderNumber: orderNumber.trim().toUpperCase(), customerId, iat, exp })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getOrderTokenHmacSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyOrderAccessToken(
  token: string | undefined | null,
  expectedOrderRef: string
): { orderNumber: string; customerId: string } | null {
  if (!token || typeof token !== 'string' || !expectedOrderRef) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getOrderTokenHmacSecret())
      .update(payloadB64)
      .digest('base64url');

    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!parsed?.exp || now > parsed.exp) return null;
    if (
      String(parsed.orderNumber || '').toUpperCase() !== expectedOrderRef.trim().toUpperCase()
    ) {
      return null;
    }
    if (!parsed.customerId) return null;
    return { orderNumber: parsed.orderNumber, customerId: parsed.customerId };
  } catch {
    return null;
  }
}

export function attachOrderAccessCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: ORDER_ACCESS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ORDER_TOKEN_DURATION_SECONDS,
  });
}

export interface CustomerSessionContext {
  id: string; // customerId
  name: string;
  mobile: string;
  email: string;
  sessionId: string;
}

/**
 * Creates a cryptographically secure 256-bit random session identifier
 * and persists it to the database linked to the customer.
 */
export async function createCustomerSession(
  customerId: string,
  req?: NextRequest
): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_DURATION_SECONDS * 1000);

  const ipAddress = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || undefined;
  const userAgent = req?.headers.get('user-agent') || undefined;

  await prisma.customerSession.create({
    data: {
      sessionToken,
      customerId,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return sessionToken;
}

/**
 * Validates the session cookie from incoming request against the PostgreSQL database.
 * Strictly verifies expiration and returns the authenticated customer context.
 */
export async function getCustomerSessionFromRequest(
  req: NextRequest
): Promise<CustomerSessionContext | null> {
  const token = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return null;
  }

  try {
    const session = await prisma.customerSession.findUnique({
      where: { sessionToken: token },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
          },
        },
      },
    });

    if (!session || !session.customer) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      // Async background cleanup
      prisma.customerSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      id: session.customer.id,
      name: session.customer.name,
      mobile: session.customer.mobile,
      email: session.customer.email,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error verifying customer session:', error);
    return null;
  }
}

/**
 * Sets the secure HttpOnly cookie containing only the random session identifier.
 * NO sensitive data is placed in the cookie.
 */
export function attachCustomerSessionCookie(
  response: NextResponse,
  sessionToken: string
): void {
  response.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the customer session cookie upon logout.
 */
export function clearCustomerSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: CUSTOMER_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
}
