import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim().toUpperCase();
    const mobile = searchParams.get('mobile')?.trim().replace(/\D/g, '');

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: 'Please provide Order Number' },
        { status: 400 }
      );
    }

    const cleanNum = orderNumber.replace(/\s+/g, '');
    const candidateNumbers = [
      cleanNum,
      cleanNum.startsWith('KHF-ORD-') ? cleanNum : `KHF-ORD-${cleanNum}`,
    ];

    const whereClause: any = {
      OR: [
        { orderNumber: { in: candidateNumbers } },
        { cashfreeOrderId: { in: candidateNumbers } },
        { id: cleanNum },
      ],
    };
    if (mobile && mobile.length >= 10) {
      whereClause.customer = {
        mobile: {
          endsWith: mobile.slice(-10),
        },
      };
    }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: { name: true },
        },
        shippingAddress: {
          select: { city: true, state: true, pincode: true },
        },
        items: {
          select: {
            productId: true,
            productNameSnapshot: true,
            weightVariant: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        shipments: {
          select: {
            courierProvider: true,
            trackingNumber: true,
            trackingUrl: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'No order found matching this Order Number and Mobile Number. Please check and try again.',
        },
        { status: 404 }
      );
    }

    // Masked customer name (e.g. Preetham -> P****m)
    const rawName = order.customer.name;
    const maskedName =
      rawName.length > 2
        ? rawName[0] + '*'.repeat(rawName.length - 2) + rawName[rawName.length - 1]
        : rawName;

    const latestShipment = order.shipments[0] || null;

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        customerName: maskedName,
        destination: `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
        items: order.items,
        total: order.total,
        shipment: latestShipment
          ? {
              courier: latestShipment.courierProvider,
              trackingNumber: latestShipment.trackingNumber,
              trackingUrl: latestShipment.trackingUrl,
              status: latestShipment.status,
              shippedAt: latestShipment.shippedAt,
              deliveredAt: latestShipment.deliveredAt,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Order tracking error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve order tracking details' },
      { status: 500 }
    );
  }
}
