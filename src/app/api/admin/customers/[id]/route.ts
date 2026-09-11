import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const { id } = params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: { updatedAt: 'desc' },
        },
        orders: {
          include: {
            items: true,
            shippingAddress: true,
            shipments: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        referralRewards: {
          orderBy: { createdAt: 'desc' },
        },
        referralUsagesAsReferrer: {
          include: {
            order: {
              select: { orderNumber: true, total: true, createdAt: true },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const lifetimeSpend = customer.orders
      .filter((o) => !['CANCELLED', 'RETURNED'].includes(o.orderStatus))
      .reduce((acc, o) => acc + o.total, 0);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        lifetimeSpend: Math.round(lifetimeSpend),
        totalOrders: customer.orders.length,
        addresses: customer.addresses,
        orders: customer.orders,
        referralRewards: customer.referralRewards,
        referralUsages: customer.referralUsagesAsReferrer,
        recentSessions: customer.sessions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve customer details' },
      { status: 500 }
    );
  }
}
