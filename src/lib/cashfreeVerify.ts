import { prisma } from '@/lib/prisma';
import {
  CashfreePaymentEntity,
  getCashfreeOrder,
  getCashfreeOrderPayments,
} from '@/lib/cashfree';
import { settleCashfreePaymentAtomic } from '@/lib/orderPaymentSettlement';
import { isOrderPaymentConfirmed } from '@/lib/orderStateMachine';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderConfirmed,
  notifyCustomerPaymentFailed,
} from '@/lib/notifications';

export type CashfreeVerificationOutcome =
  | {
      outcome: 'PAID';
      alreadyConfirmed: boolean;
      order: any;
      successfulPayment?: CashfreePaymentEntity;
      newlySettled?: boolean;
    }
  | {
      outcome: 'PENDING';
      order: any;
      message: string;
    }
  | {
      outcome: 'CANCELLED';
      order: any;
      message: string;
    }
  | {
      outcome: 'FAILED';
      order: any;
      message: string;
    }
  | {
      outcome: 'TAMPER_MISMATCH';
      order: any;
      message: string;
    };

function getPaymentTimestamp(payment: CashfreePaymentEntity): number {
  const raw = payment.payment_completion_time || payment.payment_time || '';
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
}

/**
 * Authoritatively verifies an order's payment status against Cashfree's server-side APIs
 * and atomically settles confirmed payments. Never trusts client redirect parameters.
 */
export async function verifyCashfreeOrderStatus(order: any): Promise<CashfreeVerificationOutcome> {
  if (isOrderPaymentConfirmed(order.paymentStatus)) {
    return {
      outcome: 'PAID',
      alreadyConfirmed: true,
      order,
    };
  }

  const targetOrderId = order.cashfreeOrderId || order.orderNumber;
  const cfPaymentsRaw = await getCashfreeOrderPayments(targetOrderId);
  const cfPayments = Array.isArray(cfPaymentsRaw) ? cfPaymentsRaw : [];

  const successfulPayment = cfPayments.find((p) => p.payment_status === 'SUCCESS');

  if (successfulPayment) {
    const isCod = order.paymentMethod === 'COD';
    const expectedChargedAmount = isCod ? order.advanceAmount : order.total;

    let methodDescription = 'ONLINE';
    if (
      typeof successfulPayment.payment_method === 'object' &&
      successfulPayment.payment_method !== null
    ) {
      const methodKeys = Object.keys(successfulPayment.payment_method);
      if (methodKeys.length > 0) methodDescription = methodKeys[0].toUpperCase();
    }

    const completedAt = successfulPayment.payment_completion_time
      ? new Date(successfulPayment.payment_completion_time)
      : new Date();

    const settlement = await settleCashfreePaymentAtomic({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customer?.name,
      orderTotal: order.total,
      expectedAmount: expectedChargedAmount,
      expectedCurrency: order.currency || 'INR',
      isCod,
      referralCode: order.referralCode,
      discount: order.discount,
      currentOrderStatus: order.orderStatus,
      cashfreeOrderId: targetOrderId,
      cfPaymentId: String(successfulPayment.cf_payment_id),
      paidAmount: Number(successfulPayment.payment_amount),
      paidCurrency: successfulPayment.payment_currency || 'INR',
      paymentMethodDescription: methodDescription,
      paidAt: completedAt,
      rawPayload: successfulPayment,
      source: 'checkout_verify',
    });

    if (settlement.currencyMismatch || settlement.amountMismatch) {
      console.error(
        `🚨 [Payment Tampering Detected] Order ${order.orderNumber}: Expected ₹${expectedChargedAmount} ${order.currency}, Received ${successfulPayment.payment_amount} ${successfulPayment.payment_currency}`
      );
      return {
        outcome: 'TAMPER_MISMATCH',
        order,
        message: 'Security error: Paid amount or currency does not match authoritative order total.',
      };
    }

    const updatedOrder = settlement.updatedOrder || order;

    if (!settlement.alreadyPaid) {
      const orderWithDetails = {
        ...updatedOrder,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        items: order.items,
      };
      await Promise.allSettled([
        notifyAdminNewOrder(orderWithDetails as any).catch((err) =>
          console.warn('Admin push notice error:', err)
        ),
        notifyCustomerOrderConfirmed(orderWithDetails as any).catch((err) =>
          console.warn('Customer push notice error:', err)
        ),
      ]);
    }

    return {
      outcome: 'PAID',
      alreadyConfirmed: Boolean(settlement.alreadyPaid),
      order: updatedOrder,
      successfulPayment,
      newlySettled: !settlement.alreadyPaid,
    };
  }

  // Check if any payment attempt is actively pending confirmation from the bank
  const pendingPayment = cfPayments.find((p) => p.payment_status === 'PENDING');
  if (pendingPayment) {
    return {
      outcome: 'PENDING',
      order,
      message:
        'Payment is currently pending confirmation from bank. Please wait or check your bank app.',
    };
  }

  // Sort non-success attempts most-recent first so a retry attempt overrides older attempts
  const sortedAttempts = [...cfPayments].sort(
    (a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a)
  );
  const latestAttempt = sortedAttempts[0];

  if (latestAttempt && latestAttempt.payment_status === 'FAILED') {
    const failedClaim = await prisma.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { in: ['PAYMENT_PENDING', 'COD_ADVANCE_PENDING'] },
      },
      data: { paymentStatus: 'FAILED' },
    });

    if (failedClaim.count > 0) {
      const firstName = order.customer?.name
        ? String(order.customer.name).trim().split(' ')[0]
        : 'Customer';

      await prisma.adminNotification
        .upsert({
          where: { dedupKey: `PAYMENT_FAILED:${order.orderNumber}` },
          update: {},
          create: {
            title: `Payment Failed: ${order.orderNumber}`,
            message: `${firstName}'s payment attempt of ₹${order.total} (${order.orderNumber}) failed.`,
            type: 'PAYMENT_FAILED',
            link: `/admin/orders/${order.id}`,
            dedupKey: `PAYMENT_FAILED:${order.orderNumber}`,
          },
        })
        .catch((e) => console.warn('Failed to record admin payment failed notification:', e));

      await notifyCustomerPaymentFailed(order).catch((e) =>
        console.warn('Customer failed payment notice error:', e)
      );
    }

    return {
      outcome: 'FAILED',
      order,
      message:
        latestAttempt.payment_message ||
        'Payment failed. No payment was completed. Please try again.',
    };
  }

  // Cancelled, USER_DROPPED, or returned/closed with zero initiated payment attempts
  let cfOrderStatus: string | undefined;
  if (cfPayments.length === 0) {
    try {
      const cfOrder = await getCashfreeOrder(targetOrderId);
      cfOrderStatus = cfOrder?.order_status;
    } catch {
      // Non-fatal: empty payment list with no pending/success is treated as cancelled/uncompleted
    }
  }

  if (cfOrderStatus === 'PAID') {
    // Edge case: Cashfree order reports PAID without a payment entity in list yet -> keep pending so polling catches it
    return {
      outcome: 'PENDING',
      order,
      message:
        'Payment is currently pending confirmation from bank. Please wait or check your bank app.',
    };
  }

  return {
    outcome: 'CANCELLED',
    order,
    message: 'Payment cancelled. No payment was completed. You can try again.',
  };
}
