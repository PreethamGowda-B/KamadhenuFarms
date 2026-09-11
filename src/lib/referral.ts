import { prisma } from '@/lib/prisma';

export const STATIC_VALID_COUPONS: Record<string, { type: 'percent' | 'fixed'; value: number }> = {
  KAMADHENU10: { type: 'percent', value: 10 },
  HONEY50: { type: 'fixed', value: 50 },
  FREEPURE: { type: 'percent', value: 15 },
  PREETHUGOWDA01: { type: 'percent', value: 10 },
};

export interface CartItemInput {
  productId: string;
  weightVariant: string; // '250g', '500g', '1kg'
  quantity: number | string;
  unitPrice?: number;
}

export interface ReferralValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  calculatedDiscount: number;
  message: string;
  source: 'STATIC_COUPON' | 'REFERRAL_OFFER' | 'REFERRAL_REWARD';
  offerId?: string;
  rewardId?: string;
  minPurchaseKg?: number;
  totalWeightKg?: number;
}

/**
 * Calculates total net honey weight in Kilograms across cart items
 */
export function calculateTotalWeightKg(items: CartItemInput[] = []): number {
  let totalKg = 0;
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity), 10) || 1);
    const variant = String(it.weightVariant || '').toLowerCase();
    let unitKg = 0.5;
    if (variant.includes('250')) unitKg = 0.25;
    else if (variant.includes('500')) unitKg = 0.5;
    else if (variant.includes('1kg') || variant.includes('1000')) unitKg = 1.0;
    totalKg += unitKg * qty;
  }
  return Math.round(totalKg * 100) / 100;
}

/**
 * Server-Side Authoritative Referral & Coupon Validation
 * Preserves existing static coupons while dynamically checking active database ReferralOffers & Rewards
 */
export async function validateDiscountOrReferralCode(
  rawCode: string | undefined | null,
  subtotal: number,
  items: CartItemInput[] = [],
  customerMobile?: string | null,
  customerEmail?: string | null
): Promise<ReferralValidationResult> {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return {
      valid: false,
      code: '',
      discountType: 'fixed',
      discountValue: 0,
      calculatedDiscount: 0,
      message: 'No code provided',
      source: 'STATIC_COUPON',
    };
  }

  const code = rawCode.trim().toUpperCase();
  const totalWeightKg = calculateTotalWeightKg(items);

  // 1. Check Existing Static Coupons (Backwards Compatibility)
  if (STATIC_VALID_COUPONS[code]) {
    const coupon = STATIC_VALID_COUPONS[code];
    const discount =
      coupon.type === 'percent'
        ? Math.round(subtotal * (coupon.value / 100))
        : Math.min(subtotal, coupon.value);

    return {
      valid: true,
      code,
      discountType: coupon.type,
      discountValue: coupon.value,
      calculatedDiscount: discount,
      message: `Coupon "${code}" applied! (${coupon.value}${coupon.type === 'percent' ? '%' : ' Rs'} off)`,
      source: 'STATIC_COUPON',
      totalWeightKg,
    };
  }

  // 2. Check Database Active Referral Offers
  const now = new Date();
  const offer = await prisma.referralOffer.findUnique({
    where: { code },
    include: { referrerCustomer: true },
  });

  if (offer) {
    if (!offer.isActive) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral offer is currently inactive.',
        source: 'REFERRAL_OFFER',
        totalWeightKg,
      };
    }

    if (offer.startDate && offer.startDate > now) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral offer has not started yet.',
        source: 'REFERRAL_OFFER',
        totalWeightKg,
      };
    }

    if (offer.expiryDate && offer.expiryDate < now) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral code has expired.',
        source: 'REFERRAL_OFFER',
        totalWeightKg,
      };
    }

    if (offer.usageLimit && offer.timesUsed >= offer.usageLimit) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral code has reached its maximum usage limit.',
        source: 'REFERRAL_OFFER',
        totalWeightKg,
      };
    }

    // Abuse Prevention: Customer cannot refer themselves
    if (offer.referrerCustomer && customerMobile) {
      const cleanCustomerMobile = customerMobile.replace(/\D/g, '').slice(-10);
      const cleanReferrerMobile = offer.referrerCustomer.mobile.replace(/\D/g, '').slice(-10);
      if (cleanCustomerMobile === cleanReferrerMobile) {
        return {
          valid: false,
          code,
          discountType: 'percent',
          discountValue: 0,
          calculatedDiscount: 0,
          message: 'You cannot use your own referral code.',
          source: 'REFERRAL_OFFER',
          totalWeightKg,
        };
      }
    }

    // Minimum Qualifying Purchase Check (default 1kg)
    const minKg = offer.minPurchaseKg || 1.0;
    if (totalWeightKg < minKg) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: offer.discountPercent,
        calculatedDiscount: 0,
        message: `This referral code requires a minimum purchase of ${minKg}kg (Your cart: ${totalWeightKg}kg).`,
        source: 'REFERRAL_OFFER',
        minPurchaseKg: minKg,
        totalWeightKg,
      };
    }

    const calculatedDiscount = Math.round(subtotal * (offer.discountPercent / 100));

    return {
      valid: true,
      code,
      discountType: 'percent',
      discountValue: offer.discountPercent,
      calculatedDiscount,
      message: `Referral code "${code}" applied! You received a ${offer.discountPercent}% referral discount.`,
      source: 'REFERRAL_OFFER',
      offerId: offer.id,
      minPurchaseKg: minKg,
      totalWeightKg,
    };
  }

  // 3. Check Database Referral Reward Codes (e.g. earned 5% reward by referrers)
  const reward = await prisma.referralReward.findUnique({
    where: { rewardCode: code },
    include: { customer: true, offer: true },
  });

  if (reward) {
    if (reward.isUsed || reward.status === 'USED') {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral reward code has already been redeemed.',
        source: 'REFERRAL_REWARD',
        totalWeightKg,
      };
    }

    if (reward.status !== 'ACTIVE') {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: 0,
        calculatedDiscount: 0,
        message: 'This referral reward code is no longer active.',
        source: 'REFERRAL_REWARD',
        totalWeightKg,
      };
    }

    // Verify minimum qualifying purchase (>= 1kg)
    const minKg = reward.minPurchaseKg || 1.0;
    if (totalWeightKg < minKg) {
      return {
        valid: false,
        code,
        discountType: 'percent',
        discountValue: reward.discountPercent,
        calculatedDiscount: 0,
        message: `Your referral reward requires a purchase of ${minKg}kg or more (Your cart: ${totalWeightKg}kg).`,
        source: 'REFERRAL_REWARD',
        minPurchaseKg: minKg,
        totalWeightKg,
      };
    }

    const calculatedDiscount = Math.round(subtotal * (reward.discountPercent / 100));

    return {
      valid: true,
      code,
      discountType: 'percent',
      discountValue: reward.discountPercent,
      calculatedDiscount,
      message: `Referral Reward "${code}" applied! ${reward.discountPercent}% discount for referring customers.`,
      source: 'REFERRAL_REWARD',
      rewardId: reward.id,
      minPurchaseKg: minKg,
      totalWeightKg,
    };
  }

  return {
    valid: false,
    code,
    discountType: 'fixed',
    discountValue: 0,
    calculatedDiscount: 0,
    message: `Invalid referral code "${code}". Try "KAMADHENU10".`,
    source: 'STATIC_COUPON',
    totalWeightKg,
  };
}
