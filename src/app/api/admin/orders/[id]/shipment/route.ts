import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { courierProvider, trackingNumber, trackingUrl, shippingFee } = body;

    if (!courierProvider?.trim() || !trackingNumber?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Courier Provider and Tracking/AWB Number are required' },
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

    // Create Shipment and update Order to SHIPPED in a transaction
    const [shipment, updatedOrder] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          orderId: id,
          courierProvider: courierProvider.trim(),
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl?.trim() || null,
          shippingFee: Number(shippingFee) || order.shippingFee || 0,
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

    return NextResponse.json({
      success: true,
      shipment,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Create shipment error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to dispatch shipment' },
      { status: 500 }
    );
  }
}
