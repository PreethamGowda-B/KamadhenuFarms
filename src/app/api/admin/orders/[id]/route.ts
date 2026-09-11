import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function GET(
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Admin order detail error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { orderStatus, paymentStatus, notes } = body;

    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
        payments: true,
        shipments: true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'UPDATE_ECOMMERCE_ORDER_STATUS',
        details: JSON.stringify({
          orderId: id,
          orderNumber: currentOrder.orderNumber,
          oldStatus: currentOrder.orderStatus,
          newStatus: orderStatus || currentOrder.orderStatus,
          notes,
        }),
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Admin order update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
