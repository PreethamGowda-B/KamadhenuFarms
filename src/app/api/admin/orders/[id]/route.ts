import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  canTransitionOrderStatus,
  isOrderPaymentConfirmed,
  requiresConfirmedPaymentForOrderStatus,
} from '@/lib/orderStateMachine';
import {
  notifyCustomerOrderProcessing,
  notifyCustomerOrderPacked,
  notifyCustomerOrderDelivered,
  notifyCustomerOrderCancelled,
} from '@/lib/notifications';

export async function GET(
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
      { success: false, message: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { orderStatus, paymentStatus, notes } = body;

    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const isCollectingCodBalance = Boolean(
      body.action === 'COLLECT_COD_BALANCE' || body.collectCodBalance
    );

    if (isCollectingCodBalance) {
      if (currentOrder.paymentStatus === 'FULLY_PAID') {
        return NextResponse.json(
          { success: false, message: 'COD balance has already been collected for this order.' },
          { status: 400 }
        );
      }
      if (!isOrderPaymentConfirmed(currentOrder.paymentStatus)) {
        return NextResponse.json(
          { success: false, message: 'Cannot collect COD balance before advance/payment confirmation.' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;

    // Support marking COD balance as collected
    if (isCollectingCodBalance) {
      updateData.paymentStatus = 'FULLY_PAID';
      updateData.codBalanceCollectedAt = new Date();
      updateData.codBalanceCollectedBy = admin.email;
      if (body.markDelivered) {
        updateData.orderStatus = 'DELIVERED';
      }
    }

    const targetOrderStatus = updateData.orderStatus || currentOrder.orderStatus;
    const effectivePaymentStatus = updateData.paymentStatus || currentOrder.paymentStatus;

    if (targetOrderStatus !== currentOrder.orderStatus) {
      const transition = canTransitionOrderStatus(
        currentOrder.orderStatus,
        targetOrderStatus
      );
      if (!transition.allowed) {
        return NextResponse.json(
          { success: false, message: transition.reason || 'Invalid order status transition' },
          { status: 400 }
        );
      }

      if (
        requiresConfirmedPaymentForOrderStatus(targetOrderStatus) &&
        !isOrderPaymentConfirmed(effectivePaymentStatus)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot move order to ${targetOrderStatus} while payment status is ${effectivePaymentStatus}.`,
          },
          { status: 400 }
        );
      }
    }

    let codAlreadyCollectedRace = false;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (isCollectingCodBalance && currentOrder.codRemainingAmount > 0) {
        const claim = await tx.order.updateMany({
          where: {
            id,
            paymentStatus: { in: ['COD_ADVANCE_PAID', 'COD_BALANCE_PENDING'] },
          },
          data: {
            paymentStatus: 'FULLY_PAID',
            codBalanceCollectedAt: updateData.codBalanceCollectedAt,
            codBalanceCollectedBy: admin.email,
          },
        });
        if (claim.count === 0) {
          codAlreadyCollectedRace = true;
          return null;
        }

        await tx.payment.create({
          data: {
            orderId: id,
            provider: 'CASH_ON_DELIVERY',
            cashfreeOrderId: `COD-BAL-${currentOrder.orderNumber}`,
            cashfreePaymentId: `COD-CASH-${currentOrder.orderNumber}`,
            amount: currentOrder.codRemainingAmount,
            currency: 'INR',
            status: 'PAID',
            paymentMethod: 'CASH',
            paidAt: new Date(),
          },
        });
      }

      const updated = await tx.order.update({
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

      await tx.auditLog.create({
        data: {
          adminEmail: admin.email,
          action: 'UPDATE_ECOMMERCE_ORDER_STATUS',
          details: JSON.stringify({
            orderId: id,
            orderNumber: currentOrder.orderNumber,
            oldStatus: currentOrder.orderStatus,
            newStatus: targetOrderStatus,
            oldPaymentStatus: currentOrder.paymentStatus,
            newPaymentStatus: effectivePaymentStatus,
            notes,
          }),
        },
      });

      return updated;
    });

    if (codAlreadyCollectedRace || !updatedOrder) {
      return NextResponse.json(
        { success: false, message: 'COD balance has already been collected for this order.' },
        { status: 400 }
      );
    }

    // Customer Lifecycle Push Notification triggers on status changes (awaited cleanly so Vercel does not freeze early)
    const newEffectiveStatus = updateData.orderStatus || orderStatus;
    if (newEffectiveStatus && newEffectiveStatus !== currentOrder.orderStatus) {
      if (newEffectiveStatus === 'PROCESSING') {
        await notifyCustomerOrderProcessing(updatedOrder as any).catch((e) =>
          console.warn('Customer push notice:', e)
        );
      } else if (newEffectiveStatus === 'PACKED') {
        await notifyCustomerOrderPacked(updatedOrder as any).catch((e) =>
          console.warn('Customer push notice:', e)
        );
      } else if (newEffectiveStatus === 'DELIVERED') {
        await notifyCustomerOrderDelivered(updatedOrder as any).catch((e) =>
          console.warn('Customer push notice:', e)
        );
      } else if (newEffectiveStatus === 'CANCELLED') {
        await notifyCustomerOrderCancelled(updatedOrder as any).catch((e) =>
          console.warn('Customer push notice:', e)
        );
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Admin order update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
