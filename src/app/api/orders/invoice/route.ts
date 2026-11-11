import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  getCustomerSessionFromRequest,
  ORDER_ACCESS_COOKIE_NAME,
  verifyOrderAccessToken,
} from '@/lib/customerAuth';

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

    // Strict Customer / Order-Token / Admin Ownership Verification (No time-window or raw phone bypass):
    const admin = getAdminSessionFromRequest(req);
    const session = await getCustomerSessionFromRequest(req);
    const isOwnerBySession = Boolean(session && session.id === order.customerId);

    const rawOrderToken =
      searchParams.get('token')?.trim() ||
      req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value ||
      '';
    const tokenPayload = rawOrderToken
      ? verifyOrderAccessToken(rawOrderToken, order.orderNumber)
      : null;
    const isOwnerByOrderToken = Boolean(
      tokenPayload && tokenPayload.customerId === order.customerId
    );

    if (!admin && !isOwnerBySession && !isOwnerByOrderToken) {
      return NextResponse.json(
        { success: false, message: 'Access denied: Please sign in or open your official order confirmation link.' },
        { status: 403 }
      );
    }

    // Only confirmed/paid orders (or COD orders with advance paid) are eligible for official invoice
    const isPaid = order.paymentStatus === 'PAID' ||
                   order.paymentStatus === 'COD_ADVANCE_PAID' ||
                   order.paymentStatus === 'FULLY_PAID';
    if (!isPaid) {
      return NextResponse.json(
        { success: false, pending: true, message: 'Tax invoice is only generated once payment is confirmed by bank.' },
        { status: 402 }
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
