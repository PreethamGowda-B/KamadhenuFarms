import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              paymentStatus: true,
              orderStatus: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          addresses: {
            select: {
              id: true,
              city: true,
              state: true,
              pincode: true,
            },
          },
          referralRewards: {
            select: {
              id: true,
              rewardCode: true,
              isUsed: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedCustomers = customers.map((c) => {
      const validOrders = c.orders.filter(
        (o) => !['CANCELLED', 'RETURNED'].includes(o.orderStatus)
      );
      const lifetimeSpend = validOrders.reduce((acc, o) => acc + o.total, 0);
      const lastOrder = c.orders[0] || null;

      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        createdAt: c.createdAt.toISOString(),
        totalOrders: c.orders.length,
        lifetimeSpend: Math.round(lifetimeSpend),
        lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
        lastOrderNumber: lastOrder ? lastOrder.orderNumber : null,
        addressesCount: c.addresses.length,
        referralRewardsCount: c.referralRewards.length,
      };
    });

    return NextResponse.json({
      success: true,
      customers: formattedCustomers,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('Admin customers list error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve customers.' },
      { status: 500 }
    );
  }
}
