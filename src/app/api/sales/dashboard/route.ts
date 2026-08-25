import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const salespersonId = salesSession ? salesSession.id : undefined;

    const whereClause: any = salespersonId ? { salespersonId } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMyShops,
      newShopsThisMonth,
      interestedShops,
      confirmedShops,
      reordersDueToday,
      overdueReorders,
      pendingPayments,
      recentShops,
      recentOrders,
      recentVisits,
    ] = await Promise.all([
      prisma.shop.count({ where: whereClause }),
      prisma.shop.count({
        where: { ...whereClause, createdAt: { gte: firstOfThisMonth } },
      }),
      prisma.shop.count({
        where: { ...whereClause, responseStatus: 'INTERESTED' },
      }),
      prisma.shop.count({
        where: { ...whereClause, responseStatus: 'ORDER_CONFIRMED' },
      }),
      prisma.shop.findMany({
        where: {
          ...whereClause,
          nextReorderDate: { gte: startOfToday, lte: endOfToday },
        },
        include: { requirements: true },
        take: 10,
      }),
      prisma.shop.findMany({
        where: {
          ...whereClause,
          nextReorderDate: { lt: startOfToday },
        },
        include: { requirements: true },
        take: 10,
      }),
      prisma.shop.findMany({
        where: {
          ...whereClause,
          outstandingAmount: { gt: 0 },
        },
        orderBy: { outstandingAmount: 'desc' },
        take: 10,
      }),
      prisma.shop.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { requirements: true },
      }),
      prisma.shopOrder.findMany({
        where: salespersonId ? { salespersonId } : {},
        orderBy: { orderDate: 'desc' },
        take: 10,
        include: {
          shop: { select: { id: true, shopCode: true, shopName: true, mobile: true, area: true, city: true } },
          items: true,
        },
      }),
      prisma.shopVisit.findMany({
        where: salespersonId ? { salespersonId } : {},
        orderBy: { visitDate: 'desc' },
        take: 10,
        include: {
          shop: { select: { id: true, shopCode: true, shopName: true, mobile: true, area: true, city: true } },
        },
      }),
    ]);

    // Financial totals
    const financialAgg = await prisma.shop.aggregate({
      where: whereClause,
      _sum: {
        totalPurchaseValue: true,
        totalKgPurchased: true,
        outstandingAmount: true,
        totalPaidAmount: true,
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalMyShops,
        newShopsThisMonth,
        interestedShops,
        confirmedShops,
        reordersDueCount: reordersDueToday.length,
        overdueReordersCount: overdueReorders.length,
        totalSalesValue: financialAgg._sum.totalPurchaseValue || 0,
        totalKgSold: financialAgg._sum.totalKgPurchased || 0,
        totalOutstanding: financialAgg._sum.outstandingAmount || 0,
        totalCollected: financialAgg._sum.totalPaidAmount || 0,
      },
      reordersDue: [...reordersDueToday, ...overdueReorders],
      pendingPayments,
      recentShops,
      recentOrders,
      recentVisits,
    });
  } catch (error: any) {
    console.error('Sales dashboard error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
