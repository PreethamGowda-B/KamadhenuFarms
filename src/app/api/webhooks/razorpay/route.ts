import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('⚠️ [Razorpay Webhook] Missing x-razorpay-signature header');
      return NextResponse.json({ success: false, message: 'Missing signature' }, { status: 400 });
    }

    if (!secret) {
      console.error('❌ [Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json({ success: false, message: 'Webhook secret not configured' }, { status: 500 });
    }

    // Next.js Route Handler: Get raw request text for cryptographic verification
    const rawBody = await req.text();
    const isValid = verifyWebhookSignature(rawBody, signature, secret);

    if (!isValid) {
      console.error('❌ [Razorpay Webhook] Invalid webhook signature');
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`ℹ️ [Razorpay Webhook] Received verified event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const paymentMethod = paymentEntity?.method || 'ONLINE';

      if (razorpayOrderId) {
        // Find if order exists by razorpayOrderId
        const existingOrder = await prisma.order.findUnique({
          where: { razorpayOrderId },
          include: { payments: true },
        });

        if (existingOrder) {
          // Idempotent update: ensure order is marked PAID and CONFIRMED
          if (existingOrder.paymentStatus !== 'PAID') {
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: {
                paymentStatus: 'PAID',
                orderStatus: existingOrder.orderStatus === 'NEW' ? 'CONFIRMED' : existingOrder.orderStatus,
                razorpayPaymentId: razorpayPaymentId || existingOrder.razorpayPaymentId,
              },
            });

            // Upsert payment record
            const hasPayment = existingOrder.payments.some((p) => p.razorpayPaymentId === razorpayPaymentId);
            if (!hasPayment && razorpayPaymentId) {
              await prisma.payment.create({
                data: {
                  orderId: existingOrder.id,
                  provider: 'RAZORPAY',
                  razorpayOrderId,
                  razorpayPaymentId,
                  amount: existingOrder.total,
                  paymentMethod,
                  status: 'PAID',
                  rawResponse: JSON.stringify(paymentEntity),
                },
              });
            }
            console.log(`✅ [Razorpay Webhook] Order ${existingOrder.orderNumber} confirmed via webhook.`);
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
        if (order && order.paymentStatus === 'PAYMENT_PENDING') {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'FAILED' },
          });
          console.warn(`⚠️ [Razorpay Webhook] Payment failed for order ${order.orderNumber}`);
        }
      }
    }

    return NextResponse.json({ success: true, status: 'processed' });
  } catch (error: any) {
    console.error('Razorpay webhook processing error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
