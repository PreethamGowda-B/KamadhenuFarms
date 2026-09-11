import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest } from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please sign in or place an order to view your order history.' },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: session.id,
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productNameSnapshot: true,
            weightVariant: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        shippingAddress: {
          select: {
            recipientName: true,
            mobileNumber: true,
            addressLine1: true,
            addressLine2: true,
            area: true,
            city: true,
            state: true,
            pincode: true,
            landmark: true,
          },
        },
        shipments: {
          select: {
            id: true,
            courierProvider: true,
            trackingNumber: true,
            trackingUrl: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: session.id,
        name: session.name,
        mobile: session.mobile,
      },
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        subtotal: o.subtotal,
        shippingFee: o.shippingFee,
        discount: o.discount,
        total: o.total,
        currency: o.currency,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        orderStatus: o.orderStatus,
        items: o.items,
        shippingAddress: o.shippingAddress,
        shipment: o.shipments[0] || null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve orders.' },
      { status: 500 }
    );
  }
}
