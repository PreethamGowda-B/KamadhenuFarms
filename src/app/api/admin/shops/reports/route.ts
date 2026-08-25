import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminSession = getAdminSessionFromRequest(req);
    if (!adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || 'ALL'; // 30D, 90D, 1Y, ALL

    let dateFilter: any = undefined;
    const now = new Date();
    if (timeRange === '30D') {
      dateFilter = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    } else if (timeRange === '90D') {
      dateFilter = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    } else if (timeRange === '1Y') {
      dateFilter = { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
    }

    // 1. Top Shops by Total Sales
    const topShops = await prisma.shop.findMany({
      take: 10,
      orderBy: { totalPurchaseValue: 'desc' },
      select: {
        id: true,
        shopCode: true,
        shopName: true,
        city: true,
        area: true,
        totalOrders: true,
        totalKgPurchased: true,
        totalPurchaseValue: true,
        outstandingAmount: true,
        salespersonSnapshotName: true,
      },
    });

    // 2. Sales by Salesperson Aggregation
    const salesBySalesperson = await prisma.shop.groupBy({
      by: ['salespersonSnapshotName'],
      _sum: {
        totalPurchaseValue: true,
        totalKgPurchased: true,
        totalOrders: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPurchaseValue: 'desc',
        },
      },
    });

    // 3. Sales by Product Items
    const orderItems = await prisma.shopOrderItem.groupBy({
      by: ['productName'],
      _sum: {
        quantity: true,
        totalPrice: true,
        kg: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
    });

    // 4. Shops by City / Region Distribution
    const shopsByCity = await prisma.shop.groupBy({
      by: ['city'],
      _count: { id: true },
      _sum: { totalPurchaseValue: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    // 5. Inactive / At-Risk Shops (No orders for > 45 days)
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const atRiskShops = await prisma.shop.findMany({
      where: {
        lastOrderDate: { lt: fortyFiveDaysAgo },
        totalOrders: { gt: 0 },
      },
      take: 8,
      orderBy: { lastOrderDate: 'asc' },
      select: {
        id: true,
        shopCode: true,
        shopName: true,
        mobile: true,
        city: true,
        lastOrderDate: true,
        totalPurchaseValue: true,
        salespersonSnapshotName: true,
      },
    });

    // 6. Overall Metrics
    const totalShopsCount = await prisma.shop.count();
    const repeatShopsCount = await prisma.shop.count({ where: { totalOrders: { gte: 2 } } });
    const reorderRate = totalShopsCount > 0 ? ((repeatShopsCount / totalShopsCount) * 100).toFixed(1) : '0';

    const grandTotals = await prisma.shop.aggregate({
      _sum: {
        totalPurchaseValue: true,
        totalKgPurchased: true,
        totalOrders: true,
        outstandingAmount: true,
        totalPaidAmount: true,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalShops: totalShopsCount,
        repeatShops: repeatShopsCount,
        reorderRate: `${reorderRate}%`,
        totalSalesValue: grandTotals._sum.totalPurchaseValue || 0,
        totalKgSold: grandTotals._sum.totalKgPurchased || 0,
        totalOrders: grandTotals._sum.totalOrders || 0,
        totalOutstanding: grandTotals._sum.outstandingAmount || 0,
        totalCollected: grandTotals._sum.totalPaidAmount || 0,
      },
      topShops,
      salesBySalesperson: salesBySalesperson.map(s => ({
        salesperson: s.salespersonSnapshotName || 'Direct / Admin',
        shopsCount: s._count.id,
        totalSales: s._sum.totalPurchaseValue || 0,
        totalKg: s._sum.totalKgPurchased || 0,
        totalOrders: s._sum.totalOrders || 0,
      })),
      productBreakdown: orderItems.map(p => ({
        productName: p.productName,
        quantity: p._sum.quantity || 0,
        salesValue: p._sum.totalPrice || 0,
        totalKg: p._sum.kg || 0,
      })),
      shopsByCity: shopsByCity.map(c => ({
        city: c.city,
        count: c._count.id,
        sales: c._sum.totalPurchaseValue || 0,
      })),
      atRiskShops,
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate CRM reports' }, { status: 500 });
  }
}
