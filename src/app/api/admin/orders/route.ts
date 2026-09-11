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
    const status = searchParams.get('status')?.trim().toUpperCase() || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '25', 10));
    const skip = (page - 1) * limit;

    // Build Prisma Where Clause
    const where: any = {};

    if (status !== 'ALL') {
      if (['NEW', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(status)) {
        where.orderStatus = status;
      } else if (['PAID', 'PAYMENT_PENDING', 'FAILED', 'REFUNDED'].includes(status)) {
        where.paymentStatus = status;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
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

    // Calculate Ecommerce KPI Statistics
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayOrdersCount,
      pendingOrdersCount,
      paidOrdersCount,
      processingCount,
      packedCount,
      shippedCount,
      deliveredCount,
      failedPaymentsCount,
      refundsCount,
      pendingShipmentsCount,
      todayRevenueAgg,
      monthlyRevenueAgg,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { orderStatus: 'NEW' } }),
      prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      prisma.order.count({ where: { orderStatus: 'PROCESSING' } }),
      prisma.order.count({ where: { orderStatus: 'PACKED' } }),
      prisma.order.count({ where: { orderStatus: 'SHIPPED' } }),
      prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
      prisma.order.count({ where: { paymentStatus: 'FAILED' } }),
      prisma.order.count({ where: { paymentStatus: 'REFUNDED' } }),
      prisma.order.count({
        where: {
          paymentStatus: 'PAID',
          orderStatus: { in: ['NEW', 'CONFIRMED', 'PROCESSING', 'PACKED'] },
        },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'PAID', createdAt: { gte: startOfToday } },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'PAID', createdAt: { gte: startOfMonth } },
      }),
    ]);

    const metrics = {
      todayOrders: todayOrdersCount,
      pendingOrders: pendingOrdersCount,
      paidOrders: paidOrdersCount,
      processing: processingCount,
      packed: packedCount,
      shipped: shippedCount,
      delivered: deliveredCount,
      pendingShipments: pendingShipmentsCount,
      failedPayments: failedPaymentsCount,
      refunds: refundsCount,
      todayRevenue: todayRevenueAgg._sum.total || 0,
      monthlyRevenue: monthlyRevenueAgg._sum.total || 0,
      totalOrders: totalCount,
    };

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
