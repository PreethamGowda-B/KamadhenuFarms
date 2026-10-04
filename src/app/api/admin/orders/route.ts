import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory 20-second cache for dashboard KPI statistics to prevent connection pool exhaustion
let cachedMetrics: any = null;
let cachedMetricsTimestamp = 0;
const METRICS_CACHE_TTL_MS = 20000;

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
    const status = searchParams.get('status')?.trim().toUpperCase() || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const skip = (page - 1) * limit;

    // Build Prisma Where Clause
    const where: any = {};

    if (status !== 'ALL') {
      if (['NEW', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(status)) {
        where.orderStatus = status;
      } else if (status === 'COD') {
        where.paymentMethod = 'COD';
      } else if (status === 'FULLY_PAID' || status === 'PAID') {
        where.paymentStatus = { in: ['PAID', 'FULLY_PAID'] };
      } else if (status === 'ADVANCE_PENDING' || status === 'COD_ADVANCE_PENDING') {
        where.paymentStatus = 'COD_ADVANCE_PENDING';
      } else if (status === 'BALANCE_PENDING' || status === 'COD_ADVANCE_PAID' || status === 'COD_BALANCE_PENDING') {
        where.paymentStatus = { in: ['COD_ADVANCE_PAID', 'COD_BALANCE_PENDING'] };
      } else if (['PAYMENT_PENDING', 'FAILED', 'REFUNDED'].includes(status)) {
        where.paymentStatus = status;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { cashfreeOrderId: { contains: search, mode: 'insensitive' } },
        { cashfreePaymentId: { contains: search, mode: 'insensitive' } },
        { razorpayOrderId: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { mobile: { contains: search } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { shippingAddress: { pincode: { contains: search } } },
        { shippingAddress: { city: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch Orders & Total Count
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          shippingAddress: true,
          items: true,
          shipments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Fast Aggregated KPI Statistics with 20s in-memory caching
    const now = Date.now();
    let metrics = cachedMetrics;

    if (!metrics || now - cachedMetricsTimestamp > METRICS_CACHE_TTL_MS) {
      try {
        const nowDate = new Date();
        const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
        const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

        const [
          orderStatusGroups,
          paymentStatusGroups,
          todayAgg,
          monthAgg,
          codCount,
          pendingShipmentsCount,
        ] = await Promise.all([
          prisma.order.groupBy({
            by: ['orderStatus'],
            _count: { id: true },
          }),
          prisma.order.groupBy({
            by: ['paymentStatus'],
            _count: { id: true },
          }),
          prisma.order.aggregate({
            _count: { id: true },
            _sum: { total: true },
            where: { createdAt: { gte: startOfToday } },
          }),
          prisma.order.aggregate({
            _sum: { total: true },
            where: {
              paymentStatus: { in: ['PAID', 'FULLY_PAID', 'COD_ADVANCE_PAID'] },
              createdAt: { gte: startOfMonth },
            },
          }),
          prisma.order.count({ where: { paymentMethod: 'COD' } }),
          prisma.order.count({
            where: {
              paymentStatus: { in: ['PAID', 'FULLY_PAID', 'COD_ADVANCE_PAID'] },
              orderStatus: { in: ['NEW', 'CONFIRMED', 'PROCESSING', 'PACKED'] },
            },
          }),
        ]);

        const statusMap: Record<string, number> = {};
        for (const g of orderStatusGroups) {
          statusMap[g.orderStatus] = g._count.id;
        }

        const paymentMap: Record<string, number> = {};
        for (const g of paymentStatusGroups) {
          paymentMap[g.paymentStatus] = g._count.id;
        }

        metrics = {
          todayOrders: todayAgg._count.id || 0,
          pendingOrders: statusMap['NEW'] || 0,
          paidOrders: (paymentMap['PAID'] || 0) + (paymentMap['FULLY_PAID'] || 0),
          processing: statusMap['PROCESSING'] || 0,
          packed: statusMap['PACKED'] || 0,
          shipped: statusMap['SHIPPED'] || 0,
          delivered: statusMap['DELIVERED'] || 0,
          pendingShipments: pendingShipmentsCount || 0,
          codOrdersCount: codCount || 0,
          codBalancePendingCount: (paymentMap['COD_ADVANCE_PAID'] || 0) + (paymentMap['COD_BALANCE_PENDING'] || 0),
          failedPayments: paymentMap['FAILED'] || 0,
          refunds: paymentMap['REFUNDED'] || 0,
          todayRevenue: todayAgg._sum.total || 0,
          monthlyRevenue: monthAgg._sum.total || 0,
          totalOrders: totalCount,
        };

        cachedMetrics = metrics;
        cachedMetricsTimestamp = now;
      } catch (metricsErr) {
        console.warn('Metrics aggregation fallback:', metricsErr);
        metrics = cachedMetrics || {
          todayOrders: 0,
          pendingOrders: 0,
          paidOrders: 0,
          processing: 0,
          packed: 0,
          shipped: 0,
          delivered: 0,
          pendingShipments: 0,
          codOrdersCount: 0,
          codBalancePendingCount: 0,
          failedPayments: 0,
          refunds: 0,
          todayRevenue: 0,
          monthlyRevenue: 0,
          totalOrders: totalCount,
        };
      }
    } else {
      metrics = { ...metrics, totalOrders: totalCount };
    }

    return NextResponse.json({
      success: true,
      orders,
      metrics,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Admin orders list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch admin orders' },
      { status: 500 }
    );
  }
}
