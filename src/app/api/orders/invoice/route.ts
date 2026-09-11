import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const order = await prisma.order.findUnique({
      where: { orderNumber },
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
              provider: latestPayment.provider,
              paymentId: latestPayment.razorpayPaymentId || order.razorpayPaymentId || 'N/A',
              status: latestPayment.status,
              amount: latestPayment.amount,
              paidAt: latestPayment.createdAt.toISOString(),
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
