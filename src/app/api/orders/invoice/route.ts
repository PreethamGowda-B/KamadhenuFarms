import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest } from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim().toUpperCase();

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: 'Order number is required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber },
          { cashfreeOrderId: orderNumber },
          { id: orderNumber },
        ],
      },
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Customer Session & IDOR Verification:
    // 1. Authorized if session belongs to the customer
    const session = await getCustomerSessionFromRequest(req);
    const isOwnerBySession = session && session.id === order.customerId;

    // 2. Authorized if recently placed/confirmed order (< 2 hours checkout grace period for invoice display on redirect)
    const isRecentOrder = (Date.now() - new Date(order.createdAt).getTime()) < 2 * 60 * 60 * 1000;

    // 3. Authorized if customer mobile param matches
    const mobileParam = (searchParams.get('mobile') || searchParams.get('phone') || '').replace(/\D/g, '');
    const isMobileMatch = mobileParam.length >= 10 && mobileParam.endsWith(order.customer.mobile.replace(/\D/g, '').slice(-10));

    if (!isOwnerBySession && !isRecentOrder && !isMobileMatch) {
      return NextResponse.json(
        { success: false, message: 'Access denied: Please sign in or check your order tracking link.' },
        { status: 403 }
      );
    }

    const latestPayment = order.payments[0] || null;
    const latestShipment = order.shipments[0] || null;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        advanceAmount: order.advanceAmount,
        advancePaidAmount: order.advancePaidAmount,
        codRemainingAmount: order.codRemainingAmount,
        codBalanceCollectedAt: order.codBalanceCollectedAt,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        couponCode: null,
        total: order.total,
        currency: order.currency,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          mobile: order.customer.mobile,
        },
        shippingAddress: {
          addressLine1: order.shippingAddress.addressLine1,
          area: order.shippingAddress.area,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          pincode: order.shippingAddress.pincode,
          landmark: order.shippingAddress.landmark,
        },
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          weightVariant: item.weightVariant,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        payment: latestPayment
          ? {
              provider: latestPayment.provider || 'CASHFREE',
              paymentId: latestPayment.cashfreePaymentId || latestPayment.razorpayPaymentId || order.cashfreePaymentId || order.razorpayPaymentId || 'N/A',
              status: latestPayment.status,
              amount: latestPayment.amount,
              paidAt: (latestPayment.paidAt || latestPayment.createdAt).toISOString(),
            }
          : null,
        shipment: latestShipment
          ? {
              courier: latestShipment.courierProvider,
              trackingNumber: latestShipment.trackingNumber,
              status: latestShipment.status,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Fetch invoice error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invoice details' },
      { status: 500 }
    );
  }
}
