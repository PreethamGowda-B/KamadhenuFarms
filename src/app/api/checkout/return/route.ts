import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  attachCustomerSessionCookie,
  attachOrderAccessCookie,
  createCustomerSession,
  getCustomerSessionFromRequest,
  ORDER_ACCESS_COOKIE_NAME,
  signOrderAccessToken,
  verifyOrderAccessToken,
} from '@/lib/customerAuth';
import { verifyCashfreeOrderStatus } from '@/lib/cashfreeVerify';

export const dynamic = 'force-dynamic';

function buildRedirectUrl(req: NextRequest, pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, req.url);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lookupKey = (
      searchParams.get('orderNumber') ||
      searchParams.get('order_id') ||
      searchParams.get('order') ||
      ''
    ).trim();

    if (!lookupKey) {
      return NextResponse.redirect(buildRedirectUrl(req, '/', { checkoutStatus: 'cancelled' }), 302);
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: lookupKey }, { cashfreeOrderId: lookupKey }, { id: lookupKey }],
      },
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
        payments: true,
        shipments: true,
      },
    });

    if (!order) {
      return NextResponse.redirect(
        buildRedirectUrl(req, '/', { checkoutStatus: 'cancelled', orderNumber: lookupKey }),
        302
      );
    }

    const [customerSession, adminSession] = await Promise.all([
      getCustomerSessionFromRequest(req),
      Promise.resolve(getAdminSessionFromRequest(req)),
    ]);

    const queryToken = searchParams.get('token')?.trim() || '';
    const cookieOrderToken = req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value || '';
    const validOrderToken =
      verifyOrderAccessToken(queryToken, order.orderNumber) ||
      verifyOrderAccessToken(cookieOrderToken, order.orderNumber);

    const isOwnerBySession = Boolean(customerSession && customerSession.id === order.customerId);
    const isOwnerByOrderToken = Boolean(
      validOrderToken && validOrderToken.customerId === order.customerId
    );
    const isAuthorizedCaller = Boolean(isOwnerBySession || isOwnerByOrderToken || adminSession);

    if (!isAuthorizedCaller) {
      return NextResponse.redirect(buildRedirectUrl(req, '/', { checkoutStatus: 'cancelled' }), 302);
    }

    const freshToken =
      queryToken || cookieOrderToken || signOrderAccessToken(order.orderNumber, order.customerId);

    const verification = await verifyCashfreeOrderStatus(order);

    if (verification.outcome === 'PAID') {
      const targetUrl = buildRedirectUrl(req, '/order-confirmation', {
        orderNumber: order.orderNumber,
        token: freshToken,
      });
      const response = NextResponse.redirect(targetUrl, 302);
      if (!cookieOrderToken) {
        attachOrderAccessCookie(response, freshToken);
      }

      if (!customerSession) {
        try {
          const paidCount = await prisma.order.count({
            where: {
              customerId: order.customerId,
              paymentStatus: { in: ['PAID', 'COD_ADVANCE_PAID', 'FULLY_PAID'] },
            },
          });
          if (paidCount <= 1) {
            const sessionToken = await createCustomerSession(order.customerId, req);
            if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
          }
        } catch (sessionErr) {
          console.error('Failed to attach customer session on return:', sessionErr);
        }
      }

      return response;
    }

    if (verification.outcome === 'PENDING') {
      const targetUrl = buildRedirectUrl(req, '/order-confirmation', {
        orderNumber: order.orderNumber,
        status: 'pending',
        token: freshToken,
      });
      const response = NextResponse.redirect(targetUrl, 302);
      if (!cookieOrderToken) {
        attachOrderAccessCookie(response, freshToken);
      }
      return response;
    }

    const checkoutStatus =
      verification.outcome === 'FAILED' || verification.outcome === 'TAMPER_MISMATCH'
        ? 'failed'
        : 'cancelled';

    const targetUrl = buildRedirectUrl(req, '/', {
      checkoutStatus,
      orderNumber: order.orderNumber,
      token: freshToken,
    });
    const response = NextResponse.redirect(targetUrl, 302);
    if (!cookieOrderToken) {
      attachOrderAccessCookie(response, freshToken);
    }
    return response;
  } catch (error) {
    console.error('Cashfree return route error:', error);
    return NextResponse.redirect(buildRedirectUrl(req, '/', { checkoutStatus: 'cancelled' }), 302);
  }
}
