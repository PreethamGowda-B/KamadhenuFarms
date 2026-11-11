import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import {
  markGatewayPaymentFailedAtomic,
  settleGatewayPaymentAtomic,
} from '@/lib/orderPaymentSettlement';
import { isOrderPaymentConfirmed } from '@/lib/orderStateMachine';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderConfirmed,
  notifyCustomerPaymentFailed,
} from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ success: false, message: 'Missing signature' }, { status: 400 });
    }

    if (!secret) {
      console.error('❌ [Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json({ success: false, message: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const isValid = verifyWebhookSignature(rawBody, signature, secret);

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentMethod = String(paymentEntity?.method || 'ONLINE').toUpperCase();

      if (razorpayOrderId) {
        const existingOrder = await prisma.order.findUnique({
          where: { razorpayOrderId },
          include: {
            customer: true,
            payments: true,
          },
        });

        if (existingOrder) {
          if (isOrderPaymentConfirmed(existingOrder.paymentStatus)) {
            return NextResponse.json({ success: true, message: 'Order already confirmed' });
          }

          const paidPaise = Number(paymentEntity?.amount ?? orderEntity?.amount_paid ?? 0);
          const paidRupees = paidPaise / 100;
          const paidCurrency = String(paymentEntity?.currency || orderEntity?.currency || 'INR').toUpperCase();
          const isCod = existingOrder.paymentMethod === 'COD';
          const expectedAmount = isCod ? existingOrder.advanceAmount : existingOrder.total;
          const razorpayPaymentId = String(
            paymentEntity?.id || `rzp_${existingOrder.orderNumber}`
          );

          const settlement = await settleGatewayPaymentAtomic({
            provider: 'RAZORPAY',
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            customerId: existingOrder.customerId,
            customerName: existingOrder.customer?.name,
            orderTotal: existingOrder.total,
            expectedAmount,
            expectedCurrency: existingOrder.currency || 'INR',
            isCod,
            referralCode: existingOrder.referralCode,
            discount: existingOrder.discount ?? 0,
            currentOrderStatus: existingOrder.orderStatus || 'NEW',
            gatewayOrderId: razorpayOrderId,
            gatewayPaymentId: razorpayPaymentId,
            paidAmount: paidRupees,
            paidCurrency,
            paymentMethodDescription: paymentMethod,
            paidAt: paymentEntity?.created_at
              ? new Date(Number(paymentEntity.created_at) * 1000)
              : new Date(),
            rawPayload: paymentEntity || event,
            source: 'razorpay_webhook',
          });

          if (settlement.currencyMismatch || settlement.amountMismatch) {
            return NextResponse.json(
              { success: false, message: 'Payment amount or currency mismatch' },
              { status: 400 }
            );
          }

          if (!settlement.alreadyPaid) {
            const orderWithDetails = await prisma.order.findUnique({
              where: { id: existingOrder.id },
              include: {
                customer: { select: { name: true, mobile: true, email: true } },
                shippingAddress: { select: { city: true, pincode: true } },
                items: { select: { productNameSnapshot: true, weightVariant: true, quantity: true } },
              },
            });

            if (orderWithDetails) {
              await Promise.allSettled([
                notifyAdminNewOrder(orderWithDetails as any).catch((e) =>
                  console.warn('Razorpay webhook admin push notice:', e)
                ),
                notifyCustomerOrderConfirmed(orderWithDetails as any).catch((e) =>
                  console.warn('Razorpay webhook customer push notice:', e)
                ),
              ]);
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        const order = await prisma.order.findUnique({
          where: { razorpayOrderId },
          include: { customer: true },
        });
        if (order) {
          const markedFailed = await markGatewayPaymentFailedAtomic({
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderTotal: order.total,
            customerName: order.customer?.name,
            providerLabel: 'Razorpay',
          });
          if (markedFailed) {
            await notifyCustomerPaymentFailed(order as any).catch((e) =>
              console.warn('Razorpay webhook failed payment push notice:', e)
            );
          }
          return NextResponse.json({ success: true, status: 'marked_failed' });
        }
      }
    }

    return NextResponse.json({ success: true, status: 'processed' });
  } catch (error: any) {
    console.error('Razorpay webhook processing error:', error);
    return NextResponse.json({ success: false, message: 'Webhook processing failed' }, { status: 500 });
  }
}
