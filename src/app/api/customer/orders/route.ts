import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest, createCustomerSession, attachCustomerSessionCookie } from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const mobileParam = (searchParams.get('mobile') || searchParams.get('phone') || '').replace(/\D/g, '').slice(-10);
    const orderNumberParam = (searchParams.get('orderNumber') || '').trim();

    let resolvedCustomerId = session?.id;
    let customerData = session ? { id: session.id, name: session.name, mobile: session.mobile } : null;

    if (!resolvedCustomerId && mobileParam.length === 10) {
      const customer = await prisma.customer.findFirst({
        where: { mobile: { endsWith: mobileParam } },
        select: { id: true, name: true, mobile: true },
      });
      if (customer) {
        resolvedCustomerId = customer.id;
        customerData = customer;
      }
    } else if (!resolvedCustomerId && orderNumberParam) {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: orderNumberParam },
            { cashfreeOrderId: orderNumberParam },
            { id: orderNumberParam },
          ],
        },
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      });
      if (order && order.customer) {
        resolvedCustomerId = order.customer.id;
        customerData = order.customer;
      }
    }

    if (!resolvedCustomerId || !customerData) {
      return NextResponse.json(
        { success: false, message: 'Please sign in or place an order to view your order history.' },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: resolvedCustomerId,
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

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customerData.id,
        name: customerData.name,
        mobile: customerData.mobile,
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

    if (!session && resolvedCustomerId) {
      try {
        const sessionToken = await createCustomerSession(resolvedCustomerId, req);
        if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
      } catch (e) {}
    }

    return response;
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve orders.' },
      { status: 500 }
    );
  }
}
