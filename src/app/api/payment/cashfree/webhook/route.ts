import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCashfreeWebhookSignature, isFreshWebhookTimestamp } from '@/lib/cashfree';
import {
  markGatewayPaymentFailedAtomic,
  settleCashfreePaymentAtomic,
} from '@/lib/orderPaymentSettlement';
import { isOrderPaymentConfirmed } from '@/lib/orderStateMachine';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderConfirmed,
  notifyCustomerPaymentFailed,
} from '@/lib/notifications';

export async function GET() {
  return NextResponse.json(
    { status: 'active', message: 'Cashfree webhook endpoint is active and reachable' },
    { status: 200 }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');

    const rawBody = await req.text();

    // Dashboard Test Ping check: Only allow unauthenticated 200 when payload is empty reachability ping
    if (!signature || !timestamp) {
      if (!rawBody || rawBody.trim() === '' || rawBody.trim() === '{}') {
        return NextResponse.json(
          { status: 'active', message: 'Webhook endpoint reachable. Full signature verification active for events.' },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Missing webhook signature or timestamp headers' },
        { status: 401 }
      );
    }

    // 1. Replay Window Verification (±5 minutes)
    if (!isFreshWebhookTimestamp(timestamp, 300)) {
      console.error('❌ [Cashfree Webhook] Stale or invalid webhook timestamp');
      return NextResponse.json(
        { success: false, message: 'Stale webhook timestamp' },
        { status: 401 }
      );
    }

    // 2. Cryptographic Signature Verification
    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.error('❌ [Cashfree Webhook] Cryptographic signature verification failed');
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = payload.type || payload.event;
    const orderData = payload.data?.order || payload.order;
    const paymentData = payload.data?.payment || payload.payment;
    const cashfreeOrderId = orderData?.order_id || payload.order_id;

    if (!cashfreeOrderId) {
      return NextResponse.json({ success: true, message: 'No order_id present, skipped' });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ cashfreeOrderId }, { orderNumber: cashfreeOrderId }],
      },
      include: {
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: true, message: 'Order not found in database, skipped' });
    }

    const isCod = order.paymentMethod === 'COD';
    const normalizedType = String(eventType || '').toUpperCase().replace(/[\s-]+/g, '_');

    // 3. Handle Strictly Verified Successful Payment
    const hasExplicitPaymentSuccess = paymentData?.payment_status === 'SUCCESS';
    const isSuccessEvent =
      normalizedType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      normalizedType === 'ORDER_PAID' ||
      hasExplicitPaymentSuccess;

    if (isSuccessEvent && (!paymentData?.payment_status || paymentData.payment_status === 'SUCCESS')) {
      if (isOrderPaymentConfirmed(order.paymentStatus)) {
        return NextResponse.json({ success: true, message: 'Order already confirmed' });
      }

      const paymentAmount = Number(paymentData?.payment_amount ?? orderData?.order_amount ?? 0);
      const expectedAmount = isCod ? order.advanceAmount : order.total;
      const cfPaymentId = String(paymentData?.cf_payment_id || `cf_${order.orderNumber}_${timestamp}`);

      let methodDescription = 'ONLINE';
      if (typeof paymentData?.payment_method === 'object' && paymentData?.payment_method !== null) {
        const keys = Object.keys(paymentData.payment_method);
        if (keys.length > 0) methodDescription = keys[0].toUpperCase();
      }

      const settlement = await settleCashfreePaymentAtomic({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer?.name,
        orderTotal: order.total,
        expectedAmount,
        expectedCurrency: order.currency || 'INR',
        isCod,
        referralCode: order.referralCode,
        discount: order.discount,
        currentOrderStatus: order.orderStatus,
        cashfreeOrderId,
        cfPaymentId,
        paidAmount: paymentAmount,
        paidCurrency: paymentData?.payment_currency || 'INR',
        paymentMethodDescription: methodDescription,
        paidAt: paymentData?.payment_time ? new Date(paymentData.payment_time) : new Date(),
        rawPayload: paymentData || payload,
        source: 'cashfree_webhook',
      });

      if (settlement.currencyMismatch || settlement.amountMismatch) {
        console.error(
          `🚨 [Cashfree Webhook Tamper Risk] Order ${order.orderNumber}: Expected ₹${expectedAmount} ${order.currency}, Webhook reported ${paymentAmount} ${paymentData?.payment_currency}`
        );
        return NextResponse.json(
          { success: false, message: 'Payment amount or currency mismatch' },
          { status: 400 }
        );
      }

      if (!settlement.alreadyPaid) {
        const orderWithDetails = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            customer: { select: { name: true, mobile: true, email: true } },
            shippingAddress: { select: { city: true, pincode: true } },
            items: { select: { productNameSnapshot: true, weightVariant: true, quantity: true } },
          },
        });

        if (orderWithDetails) {
          notifyAdminNewOrder(orderWithDetails as any).catch((e) =>
            console.warn('Webhook admin push notice:', e)
          );
          notifyCustomerOrderConfirmed(orderWithDetails as any).catch((e) =>
            console.warn('Webhook customer push notice:', e)
          );
        }
      }

      return NextResponse.json({ success: true, status: 'processed' });
    }

    // 4. Handle Failed Payment Atomically
    const isFailedEvent =
      normalizedType.includes('FAIL') ||
      normalizedType.includes('USER_DROPPED') ||
      paymentData?.payment_status === 'FAILED' ||
      paymentData?.payment_status === 'USER_DROPPED' ||
      paymentData?.payment_status === 'CANCELLED';

    if (isFailedEvent) {
      const markedFailed = await markGatewayPaymentFailedAtomic({
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderTotal: order.total,
        customerName: order.customer?.name,
        providerLabel: 'Cashfree',
      });

      if (markedFailed) {
        notifyCustomerPaymentFailed(order as any).catch((e) =>
          console.warn('Webhook customer failed payment push notice:', e)
        );
      }

      return NextResponse.json({ success: true, status: 'marked_failed' });
    }

    return NextResponse.json({ success: true, message: `Event ${eventType} received and ignored` });
  } catch (error: any) {
    console.error('Cashfree webhook processing error:', error);
    return NextResponse.json({ success: false, message: 'Webhook processing error' }, { status: 500 });
  }
}
