import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest } from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Strictly verify customer session from secure HttpOnly cookie
    const session = await getCustomerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const customerId = session.id;

    // Fetch unique saved addresses and order statistics for authenticated customer
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

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: session.id,
        name: session.name,
        mobile: session.mobile,
        email: session.email,
      },
      savedAddresses: addresses,
      ordersCount,
    });
  } catch (error: any) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { authenticated: false, message: 'Unable to retrieve customer session' },
      { status: 500 }
    );
  }
}
