import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest, createCustomerSession, attachCustomerSessionCookie } from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const mobileParam = (searchParams.get('mobile') || searchParams.get('phone') || '').replace(/\D/g, '').slice(-10);

    let customerId = session?.id;
    let customerInfo = session ? { id: session.id, name: session.name, mobile: session.mobile, email: session.email } : null;

    if (!customerId && mobileParam.length === 10) {
      const customer = await prisma.customer.findFirst({
        where: { mobile: { endsWith: mobileParam } },
        select: { id: true, name: true, mobile: true, email: true },
      });
      if (customer) {
        customerId = customer.id;
        customerInfo = customer;
      }
    }

    if (!customerId || !customerInfo) {
      return NextResponse.json({ authenticated: false });
    }

    // Fetch unique saved addresses and order statistics
    const [addresses, ordersCount] = await Promise.all([
      prisma.address.findMany({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          recipientName: true,
          mobileNumber: true,
          addressLine1: true,
          addressLine2: true,
          area: true,
          city: true,
          state: true,
          pincode: true,
          landmark: true,
        },
      }),
      prisma.order.count({
        where: { customerId },
      }),
    ]);

    const response = NextResponse.json({
      authenticated: true,
      customer: {
        id: customerInfo.id,
        name: customerInfo.name,
        mobile: customerInfo.mobile,
        email: customerInfo.email,
      },
      savedAddresses: addresses,
      ordersCount,
    });

    if (!session && customerId) {
      try {
        const sessionToken = await createCustomerSession(customerId, req);
        if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
      } catch (e) {}
    }

    return response;
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { authenticated: false, message: 'Unable to retrieve customer session' },
      { status: 500 }
    );
  }
}
