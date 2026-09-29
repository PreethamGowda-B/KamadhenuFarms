import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { status: 'active', message: 'Cashfree webhook endpoint is active and reachable' },
    { status: 200 }
  );
}

export async function HEAD(req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');

    // Dashboard Test Ping check: Return 200 so Cashfree dashboard Test button passes
    if (!signature || !timestamp) {
      console.log('ℹ️ [Cashfree Webhook] Dashboard test ping / reachability probe received.');
      return NextResponse.json(
        { status: 'active', message: 'Webhook endpoint reachable. Full signature verification active for events.' },
        { status: 200 }
      );
    }

    // Read raw request text for cryptographic verification
    const rawBody = await req.text();
    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);

    if (!isValid) {
      console.error('❌ [Cashfree Webhook] Cryptographic signature verification failed');
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = payload.type || payload.event;
    console.log(`ℹ️ [Cashfree Webhook] Verified event received: ${eventType}`);

    const orderData = payload.data?.order || payload.order;
    const paymentData = payload.data?.payment || payload.payment;
    const cashfreeOrderId = orderData?.order_id || payload.order_id;

    if (!cashfreeOrderId) {
      console.warn('⚠️ [Cashfree Webhook] No order_id found in webhook payload');
      return NextResponse.json({ success: true, message: 'No order_id present, skipped' });
    }

    // Lookup order in database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { cashfreeOrderId },
          { orderNumber: cashfreeOrderId },
        ],
      },
      include: {
        customer: true,
        payments: true,
      },
    });

    if (!order) {
      console.warn(`⚠️ [Cashfree Webhook] Order ${cashfreeOrderId} not found in database`);
      return NextResponse.json({ success: true, message: 'Order not found in database, skipped' });
    }

    const isCod = order.paymentMethod === 'COD';
    const normalizedType = String(eventType || '').toUpperCase().replace(/[\s-]+/g, '_');

    // 1. Handle Successful Payment
    const isSuccessEvent =
      normalizedType.includes('SUCCESS') ||
      normalizedType.includes('ORDER_PAID') ||
      paymentData?.payment_status === 'SUCCESS';

    if (isSuccessEvent) {
      const paymentStatus = paymentData?.payment_status || 'SUCCESS';
      const paymentAmount = Number(paymentData?.payment_amount || orderData?.order_amount || 0);
      const cfPaymentId = String(paymentData?.cf_payment_id || `cf_${Date.now()}`);

      // Idempotency: If already marked PAID or COD_ADVANCE_PAID, skip to avoid duplicate processing
      if (order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_ADVANCE_PAID' || order.paymentStatus === 'FULLY_PAID') {
        console.log(`ℹ️ [Cashfree Webhook] Order ${order.orderNumber} already marked ${order.paymentStatus}. Idempotent return.`);
        return NextResponse.json({ success: true, message: 'Order already confirmed' });
      }

      // Security check: Payment amount must cover required amount
      const expectedAmount = isCod ? order.advanceAmount : order.total;
      if (paymentAmount < expectedAmount) {
        console.error(
          `🚨 [Cashfree Webhook Tamper Risk] Order ${order.orderNumber}: Expected ₹${expectedAmount}, Webhook reported ₹${paymentAmount}`
        );
        return NextResponse.json(
          { success: false, message: 'Payment amount mismatch' },
          { status: 400 }
        );
      }

      let methodDescription = 'ONLINE';
      if (typeof paymentData?.payment_method === 'object' && paymentData?.payment_method !== null) {
        const keys = Object.keys(paymentData.payment_method);
        if (keys.length > 0) methodDescription = keys[0].toUpperCase();
      }

      await prisma.$transaction(async (tx) => {
        // Mark Order as Confirmed & Paid
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: isCod ? 'COD_ADVANCE_PAID' : 'PAID',
            orderStatus: order.orderStatus === 'NEW' ? 'CONFIRMED' : order.orderStatus,
            cashfreeOrderId,
            cashfreePaymentId: cfPaymentId,
            advancePaidAmount: paymentAmount,
          },
        });

        // Upsert Payment Record (Idempotent by payment ID)
        const hasPayment = order.payments.some((p) => p.cashfreePaymentId === cfPaymentId);
        if (!hasPayment) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              provider: 'CASHFREE',
              cashfreeOrderId,
              cashfreePaymentId: cfPaymentId,
              amount: paymentAmount,
              currency: paymentData?.payment_currency || 'INR',
              paymentMethod: isCod ? 'COD_ADVANCE' : methodDescription,
              status: 'PAID',
              paidAt: paymentData?.payment_time ? new Date(paymentData.payment_time) : new Date(),
              rawResponse: JSON.stringify(paymentData || payload),
            },
          });
        }

        // Referral qualification logic
        if (order.referralCode) {
          const offer = await tx.referralOffer.findFirst({
            where: { code: order.referralCode, isActive: true },
          });

          if (offer) {
            await tx.referralOffer.update({
              where: { id: offer.id },
              data: { timesUsed: { increment: 1 } },
            });

            const priorOrders = await tx.order.count({
              where: {
                customerId: order.customerId,
                id: { not: order.id },
                paymentStatus: { in: ['PAID', 'COD_ADVANCE_PAID', 'FULLY_PAID'] },
              },
            });
            const isGenuinelyNew = priorOrders === 0;
            const hasReferrer = Boolean(offer.referrerCustomerId && offer.referrerCustomerId !== order.customerId);
            const qualifies = isGenuinelyNew && hasReferrer;

            const existingUsage = await tx.referralUsage.findFirst({
              where: { orderId: order.id },
            });

            if (!existingUsage) {
              await tx.referralUsage.create({
                data: {
                  offerId: offer.id,
                  orderId: order.id,
                  referrerCustomerId: offer.referrerCustomerId || null,
                  referredCustomerId: order.customerId,
                  discountApplied: order.discount,
                  status: qualifies ? 'QUALIFIED' : isGenuinelyNew ? 'QUALIFIED_GLOBAL' : 'DISCOUNT_ONLY',
                  qualifiesReward: qualifies,
                },
              });
            }

            if (qualifies && offer.referrerCustomerId) {
              const rewardCode = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
              await tx.referralReward.create({
                data: {
                  offerId: offer.id,
                  customerId: offer.referrerCustomerId,
                  rewardCode,
                  discountPercent: 5.0,
                  minPurchaseKg: 1.0,
                  sourceOrderId: order.id,
                  status: 'ACTIVE',
                },
              });

              await tx.adminNotification.create({
                data: {
                  title: `Referral Reward Earned (5%)`,
                  message: `Referrer earned reward code ${rewardCode} from new customer order ${order.orderNumber}.`,
                  type: 'REFERRAL_REWARD',
                  link: `/admin/referrals`,
                },
              });
            }
          }
        }

        // Admin Notification
        await tx.adminNotification.create({
          data: {
            title: `New Online Order: ${order.orderNumber}`,
            message: `${order.customer.name} completed payment of ₹${order.total} (${order.orderNumber}) via Cashfree webhook.`,
            type: 'HIGH_VALUE_ORDER',
            link: `/admin/orders/${order.id}`,
          },
        });
      });

      console.log(`✅ [Cashfree Webhook] Order ${order.orderNumber} successfully marked PAID.`);
      return NextResponse.json({ success: true, status: 'processed' });
    }

    // 2. Handle Failed Payment
    const isFailedEvent =
      normalizedType.includes('FAIL') ||
      normalizedType.includes('USER_DROPPED') ||
      paymentData?.payment_status === 'FAILED';

    if (isFailedEvent) {
      if (order.paymentStatus === 'PAYMENT_PENDING' || order.paymentStatus === 'COD_ADVANCE_PENDING') {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });
        console.warn(`⚠️ [Cashfree Webhook] Payment failed marked for order ${order.orderNumber}`);
      }
      return NextResponse.json({ success: true, status: 'marked_failed' });
    }

    return NextResponse.json({ success: true, message: `Event ${eventType} received and ignored` });
  } catch (error: any) {
    console.error('Cashfree webhook processing error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
