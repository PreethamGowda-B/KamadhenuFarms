import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'DUE_TODAY'; // DUE_TODAY, OVERDUE, DUE_SOON, ALL_UPCOMING
    const salespersonId = searchParams.get('salespersonId') || 'ALL';

    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (salesSession && !adminSession) {
      where.salespersonId = salesSession.id;
    } else if (salespersonId !== 'ALL') {
      where.salespersonId = salespersonId;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (filter === 'DUE_TODAY') {
      where.nextReorderDate = { gte: startOfToday, lte: endOfToday };
    } else if (filter === 'OVERDUE') {
      where.nextReorderDate = { lt: startOfToday };
    } else if (filter === 'DUE_SOON') {
      where.nextReorderDate = { gt: endOfToday, lte: threeDaysFromNow };
    } else if (filter === 'ALL_UPCOMING') {
      where.nextReorderDate = { gte: startOfToday, lte: sevenDaysFromNow };
    }

    const shops = await prisma.shop.findMany({
      where,
      orderBy: { nextReorderDate: 'asc' },
      include: {
        requirements: true,
        orders: { take: 1, orderBy: { orderDate: 'desc' } },
        salesperson: {
          select: { id: true, applicationNo: true, fullName: true, mobileNumber: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: shops.length,
      filter,
      shops,
    });
  } catch (error: any) {
    console.error('Reorders fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reorders' }, { status: 500 });
  }
}
