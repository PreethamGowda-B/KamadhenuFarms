import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export type PaymentGatewayProvider = 'CASHFREE' | 'RAZORPAY';

export interface GatewaySettlementInput {
  provider: PaymentGatewayProvider;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName?: string | null;
  orderTotal: number;
  expectedAmount: number;
  expectedCurrency: string;
  isCod: boolean;
  referralCode?: string | null;
  discount: number;
  currentOrderStatus: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  paidAmount: number;
  paidCurrency?: string | null;
  paymentMethodDescription: string;
  paidAt: Date;
  rawPayload: unknown;
  source: 'checkout_verify' | 'cashfree_webhook' | 'razorpay_webhook';
}

export interface CashfreeSettlementInput {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName?: string | null;
  orderTotal: number;
  expectedAmount: number;
  expectedCurrency: string;
  isCod: boolean;
  referralCode?: string | null;
  discount: number;
  currentOrderStatus: string;
  cashfreeOrderId: string;
  cfPaymentId: string;
  paidAmount: number;
  paidCurrency?: string | null;
  paymentMethodDescription: string;
  paidAt: Date;
  rawPayload: unknown;
  source: 'checkout_verify' | 'cashfree_webhook';
}

export interface SettlementResult {
  settled: boolean;
  alreadyPaid: boolean;
  amountMismatch?: boolean;
  currencyMismatch?: boolean;
  updatedOrder?: any;
}

/**
 * Atomically and idempotently settles a verified gateway payment (Cashfree or Razorpay;
 * full online payment or 50% COD advance).
 * Uses a conditional `updateMany` inside `prisma.$transaction` so concurrent webhook + client verify
 * calls cannot double-apply referral counts, reward minting, or reward redemptions.
 */
export async function settleGatewayPaymentAtomic(
  input: GatewaySettlementInput
): Promise<SettlementResult> {
  const paidCurrency = (input.paidCurrency || 'INR').trim().toUpperCase();
  const expectedCurrency = (input.expectedCurrency || 'INR').trim().toUpperCase();

  if (paidCurrency !== expectedCurrency) {
    return { settled: false, alreadyPaid: false, currencyMismatch: true };
  }

  // Allow 1 paisa tolerance for floating-point representation only
  if (!Number.isFinite(input.paidAmount) || input.paidAmount + 0.01 < input.expectedAmount) {
    return { settled: false, alreadyPaid: false, amountMismatch: true };
  }

  const targetPaymentStatus = input.isCod ? 'COD_ADVANCE_PAID' : 'PAID';
  const nextOrderStatus =
    input.currentOrderStatus === 'NEW' ? 'CONFIRMED' : input.currentOrderStatus;
  const isRazorpay = input.provider === 'RAZORPAY';

  const txResult = await prisma.$transaction(async (tx) => {
    // 1. Atomic Compare-And-Swap on Order Payment Status
    const claim = await tx.order.updateMany({
      where: {
        id: input.orderId,
        paymentStatus: { in: ['PAYMENT_PENDING', 'COD_ADVANCE_PENDING', 'FAILED'] },
      },
      data: {
        paymentStatus: targetPaymentStatus,
        orderStatus: nextOrderStatus as any,
        advancePaidAmount: input.paidAmount,
        ...(isRazorpay
          ? {
              razorpayOrderId: input.gatewayOrderId,
              razorpayPaymentId: input.gatewayPaymentId,
            }
          : {
              cashfreeOrderId: input.gatewayOrderId,
              cashfreePaymentId: input.gatewayPaymentId,
            }),
      },
    });

    if (claim.count === 0) {
      const existingOrder = await tx.order.findUnique({ where: { id: input.orderId } });
      return { alreadyPaid: true, order: existingOrder };
    }

    // 2. Record Payment Entry (idempotent check by gateway payment ID)
    const existingPayment = await tx.payment.findFirst({
      where: isRazorpay
        ? { orderId: input.orderId, razorpayPaymentId: input.gatewayPaymentId }
        : { orderId: input.orderId, cashfreePaymentId: input.gatewayPaymentId },
    });

    if (!existingPayment) {
      await tx.payment.create({
        data: {
          orderId: input.orderId,
          provider: input.provider,
          ...(isRazorpay
            ? {
                razorpayOrderId: input.gatewayOrderId,
                razorpayPaymentId: input.gatewayPaymentId,
              }
            : {
                cashfreeOrderId: input.gatewayOrderId,
                cashfreePaymentId: input.gatewayPaymentId,
              }),
          amount: input.paidAmount,
          currency: paidCurrency,
          paymentMethod: input.isCod ? 'COD_ADVANCE' : input.paymentMethodDescription,
          status: 'PAID',
          paidAt: input.paidAt,
          rawResponse: JSON.stringify(input.rawPayload),
        },
      });
    }

    // 3. Referral & Reward Processing (executed ONCE when claim.count === 1)
    if (input.referralCode) {
      const offer = await tx.referralOffer.findFirst({
        where: { code: input.referralCode, isActive: true },
      });

      if (offer) {
        // Respect usage limit atomically if configured
        if (offer.usageLimit) {
          await tx.referralOffer.updateMany({
            where: { id: offer.id, timesUsed: { lt: offer.usageLimit } },
            data: { timesUsed: { increment: 1 } },
          });
        } else {
          await tx.referralOffer.update({
            where: { id: offer.id },
            data: { timesUsed: { increment: 1 } },
          });
        }

        const priorPaidOrdersCount = await tx.order.count({
          where: {
            customerId: input.customerId,
            id: { not: input.orderId },
            paymentStatus: { in: ['PAID', 'COD_ADVANCE_PAID', 'FULLY_PAID'] },
          },
        });
        const isGenuinelyNewCustomer = priorPaidOrdersCount === 0;
        const hasReferrer = Boolean(
          offer.referrerCustomerId && offer.referrerCustomerId !== input.customerId
        );
        const qualifiesReward = isGenuinelyNewCustomer && hasReferrer;

        const existingUsage = await tx.referralUsage.findFirst({
          where: { orderId: input.orderId },
        });

        if (!existingUsage) {
          await tx.referralUsage.create({
            data: {
              offerId: offer.id,
              orderId: input.orderId,
              referrerCustomerId: offer.referrerCustomerId || null,
              referredCustomerId: input.customerId,
              discountApplied: input.discount,
              status: qualifiesReward
                ? 'QUALIFIED'
                : isGenuinelyNewCustomer
                ? 'QUALIFIED_GLOBAL'
                : 'DISCOUNT_ONLY',
              qualifiesReward,
            },
          });
        }

        if (qualifiesReward && offer.referrerCustomerId) {
          const rewardSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
          const rewardCode = `REWARD-${rewardSuffix}`;
          await tx.referralReward.create({
            data: {
              offerId: offer.id,
              customerId: offer.referrerCustomerId,
              rewardCode,
              discountPercent: 5.0,
              minPurchaseKg: 1.0,
              sourceOrderId: input.orderId,
              status: 'ACTIVE',
            },
          });

          await tx.adminNotification.upsert({
            where: { dedupKey: `REF_REWARD:${input.orderNumber}:${rewardCode}` },
            update: {},
            create: {
              title: 'Referral Reward Earned (5%)',
              message: `Referrer earned reward code ${rewardCode} from new customer order ${input.orderNumber}.`,
              type: 'REFERRAL_REWARD',
              link: '/admin/referrals',
              dedupKey: `REF_REWARD:${input.orderNumber}:${rewardCode}`,
            },
          });
        }
      } else {
        // Atomic redemption of personal ReferralReward code (prevents double-spend)
        await tx.referralReward.updateMany({
          where: {
            rewardCode: input.referralCode,
            status: 'ACTIVE',
            isUsed: false,
          },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedOrderId: input.orderId,
            status: 'USED',
          },
        });
      }
    }

    // 4. Deduplicated Admin In-Portal Notification
    const firstName = input.customerName
      ? String(input.customerName).trim().split(' ')[0]
      : 'Customer';

    const sourceLabel =
      input.source === 'cashfree_webhook'
        ? 'Cashfree webhook'
        : input.source === 'razorpay_webhook'
        ? 'Razorpay webhook'
        : 'Cashfree';

    await tx.adminNotification.upsert({
      where: { dedupKey: `ORDER_PAID:${input.orderNumber}` },
      update: {},
      create: {
        title: `New Order: ${input.orderNumber}`,
        message: `${firstName} completed payment of ₹${input.orderTotal} (${input.orderNumber}) via ${sourceLabel}.`,
        type: 'HIGH_VALUE_ORDER',
        link: `/admin/orders/${input.orderId}`,
        dedupKey: `ORDER_PAID:${input.orderNumber}`,
        metadata: JSON.stringify({
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          total: input.orderTotal,
          source: input.source,
        }),
      },
    });

    const updatedOrder = await tx.order.findUnique({ where: { id: input.orderId } });
    return { alreadyPaid: false, order: updatedOrder };
  });

  return {
    settled: !txResult.alreadyPaid,
    alreadyPaid: txResult.alreadyPaid,
    updatedOrder: txResult.order,
  };
}

export async function settleCashfreePaymentAtomic(
  input: CashfreeSettlementInput
): Promise<SettlementResult> {
  return settleGatewayPaymentAtomic({
    ...input,
    provider: 'CASHFREE',
    gatewayOrderId: input.cashfreeOrderId,
    gatewayPaymentId: input.cfPaymentId,
  });
}

export async function markGatewayPaymentFailedAtomic(input: {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  customerName?: string | null;
  providerLabel: 'Cashfree' | 'Razorpay';
}): Promise<boolean> {
  const claim = await prisma.order.updateMany({
    where: {
      id: input.orderId,
      paymentStatus: { in: ['PAYMENT_PENDING', 'COD_ADVANCE_PENDING'] },
    },
    data: { paymentStatus: 'FAILED' },
  });

  if (claim.count === 0) return false;

  const firstName = input.customerName
    ? String(input.customerName).trim().split(' ')[0]
    : 'Customer';

  await prisma.adminNotification
    .upsert({
      where: { dedupKey: `PAYMENT_FAILED:${input.orderNumber}` },
      update: {},
      create: {
        title: `Payment Failed: ${input.orderNumber}`,
        message: `${firstName}'s payment attempt of ₹${input.orderTotal} (${input.orderNumber}) failed via ${input.providerLabel} webhook.`,
        type: 'PAYMENT_FAILED',
        link: `/admin/orders/${input.orderId}`,
        dedupKey: `PAYMENT_FAILED:${input.orderNumber}`,
      },
    })
    .catch((e) => console.warn('Failed to record webhook admin notification:', e));

  return true;
}
