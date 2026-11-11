import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  canTransitionOrderStatus,
  isOrderPaymentConfirmed,
  sanitizeTrackingUrl,
} from '@/lib/orderStateMachine';
import { notifyCustomerOrderShipped } from '@/lib/notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { courierProvider, trackingNumber, trackingUrl, shippingFee } = body;

    if (!courierProvider?.trim() || !trackingNumber?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Courier Provider and Tracking/AWB Number are required' },
        { status: 400 }
      );
    }

    const safeTrackingUrl = trackingUrl?.trim() ? sanitizeTrackingUrl(trackingUrl) : null;
    if (trackingUrl?.trim() && !safeTrackingUrl) {
      return NextResponse.json(
        { success: false, message: 'Tracking URL must be a valid http or https link' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const transition = canTransitionOrderStatus(order.orderStatus, 'SHIPPED');
    if (!transition.allowed) {
      return NextResponse.json(
        { success: false, message: transition.reason || 'Cannot dispatch shipment for this order status' },
        { status: 400 }
      );
    }

    if (!isOrderPaymentConfirmed(order.paymentStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot dispatch shipment before payment or COD advance is confirmed (current status: ${order.paymentStatus}).`,
        },
        { status: 400 }
      );
    }

    // Create Shipment and update Order to SHIPPED in a transaction
    const [shipment, updatedOrder] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          orderId: id,
          courierProvider: courierProvider.trim(),
          trackingNumber: trackingNumber.trim(),
          trackingUrl: safeTrackingUrl,
          shippingFee: Math.max(0, Number(shippingFee) || order.shippingFee || 0),
          status: 'SHIPPED',
          shippedAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id },
        data: {
          orderStatus: 'SHIPPED',
        },
        include: {
          customer: true,
          shippingAddress: true,
          items: true,
          shipments: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          adminEmail: admin.email,
          action: 'CREATE_SHIPMENT_DISPATCH',
          details: JSON.stringify({
            orderId: id,
            orderNumber: order.orderNumber,
            courierProvider,
            trackingNumber,
          }),
        },
      }),
    ]);

    // Dispatch Customer Push Notification for order shipment (awaited safely inside catch)
    await notifyCustomerOrderShipped(updatedOrder as any, courierProvider, trackingNumber).catch(
      (err) => console.warn('Customer shipment push error:', err)
    );

    return NextResponse.json({
      success: true,
      shipment,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Create shipment error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to dispatch shipment' },
      { status: 500 }
    );
  }
}
