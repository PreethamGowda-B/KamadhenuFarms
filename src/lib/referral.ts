import { prisma } from '@/lib/prisma';
import { AUTHORITATIVE_PRICES } from '@/lib/products';

export interface StaticCouponConfig {
  type: 'percent' | 'fixed';
  value: number;
  eligibleProductIds?: readonly string[];
  minEligibleKg?: number;
}

export const STATIC_VALID_COUPONS: Record<string, StaticCouponConfig> = {
  KAMADHENU10: { type: 'percent', value: 10 },
  HONEY50: { type: 'fixed', value: 50 },
  FREEPURE: { type: 'percent', value: 15 },
  PREETHUGOWDA01: { type: 'percent', value: 10 },
  'KHF-OFF': { type: 'percent', value: 5, eligibleProductIds: ['p1', 'p2'], minEligibleKg: 1 },
};

export interface CartItemInput {
  productId?: string;
  id?: string;
  weightVariant?: string; // '250g', '500g', '1kg'
  size?: string;
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number;
}

export interface ReferralValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  calculatedDiscount: number;
  eligibleSubtotal?: number;
  eligibleProductIds?: string[];
  message: string;
  source: 'STATIC_COUPON' | 'REFERRAL_OFFER' | 'REFERRAL_REWARD';
  offerId?: string;
  rewardId?: string;
  minPurchaseKg?: number;
  totalWeightKg?: number;
}

/**
 * Authoritatively computes subtotal for only the eligible product IDs.
 * Never trusts client-supplied totals or discounts.
 */
export function calculateEligibleSubtotal(
  items: CartItemInput[] = [],
  eligibleProductIds: readonly string[]
): number {
  const allowed = new Set(eligibleProductIds);
  let eligibleSubtotal = 0;

  for (const it of items) {
    const pid = String(it.productId ?? it.id ?? '').trim();
    if (!pid || !allowed.has(pid)) continue;

    const variant = String(it.weightVariant ?? it.size ?? '').trim();
    const qty = Math.max(1, parseInt(String(it.quantity ?? it.qty ?? 1), 10) || 1);

    const authoritativePrice = AUTHORITATIVE_PRICES[pid]?.prices?.[variant];
    const unitPrice =
      typeof authoritativePrice === 'number' && Number.isFinite(authoritativePrice)
        ? authoritativePrice
        : Number(it.unitPrice) || 0;

    if (unitPrice > 0) {
      eligibleSubtotal += unitPrice * qty;
    }
  }

  return eligibleSubtotal;
}

/**
 * Calculates total net honey weight in Kilograms for eligible product IDs only
 */
export function calculateEligibleWeightKg(
  items: CartItemInput[] = [],
  eligibleProductIds: readonly string[]
): number {
  const allowed = new Set(eligibleProductIds);
  const eligibleItems = items.filter((it) => {
    const pid = String(it.productId ?? it.id ?? '').trim();
    return pid && allowed.has(pid);
  });
  return calculateTotalWeightKg(eligibleItems);
}

/**
 * Calculates total net honey weight in Kilograms across cart items
 */
export function calculateTotalWeightKg(items: CartItemInput[] = []): number {
  let totalKg = 0;
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity ?? it.qty ?? 1), 10) || 1);
    const variant = String(it.weightVariant ?? it.size ?? '').toLowerCase();
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

    if (coupon.eligibleProductIds && coupon.eligibleProductIds.length > 0) {
      const eligibleSubtotal = calculateEligibleSubtotal(items, coupon.eligibleProductIds);
      const eligibleWeightKg = calculateEligibleWeightKg(items, coupon.eligibleProductIds);

      if (items.length > 0 && eligibleSubtotal <= 0) {
        return {
          valid: false,
          code,
          discountType: coupon.type,
          discountValue: coupon.value,
          calculatedDiscount: 0,
          eligibleSubtotal: 0,
          eligibleProductIds: [...coupon.eligibleProductIds],
          message: `Coupon "${code}" is only valid on Pure Raw Honey and Dry Fruits Honey (not applicable to Bee-Crafted Honey Comb Jar or Honey Cake).`,
          source: 'STATIC_COUPON',
          totalWeightKg,
        };
      }

      if (coupon.minEligibleKg && items.length > 0 && eligibleWeightKg < coupon.minEligibleKg) {
        return {
          valid: false,
          code,
          discountType: coupon.type,
          discountValue: coupon.value,
          calculatedDiscount: 0,
          eligibleSubtotal,
          eligibleProductIds: [...coupon.eligibleProductIds],
          minPurchaseKg: coupon.minEligibleKg,
          message: `Coupon "${code}" requires a minimum purchase of ${coupon.minEligibleKg} kg of Pure Raw Honey or Dry Fruits Honey (currently ${eligibleWeightKg} kg).`,
          source: 'STATIC_COUPON',
          totalWeightKg,
        };
      }

      const discount =
        eligibleSubtotal > 0
          ? coupon.type === 'percent'
            ? Math.round(eligibleSubtotal * (coupon.value / 100))
            : Math.min(eligibleSubtotal, coupon.value)
          : 0;

      const isPartial = items.length > 0 && eligibleSubtotal < subtotal;
      return {
        valid: true,
        code,
        discountType: coupon.type,
        discountValue: coupon.value,
        calculatedDiscount: discount,
        eligibleSubtotal,
        eligibleProductIds: [...coupon.eligibleProductIds],
        message: isPartial
          ? `Coupon "${code}" applied! (${coupon.value}% off on Pure Raw Honey & Dry Fruits Honey items only)`
          : `Coupon "${code}" applied! (${coupon.value}${coupon.type === 'percent' ? '%' : ' Rs'} off on Pure Raw Honey & Dry Fruits Honey)`,
        source: 'STATIC_COUPON',
        totalWeightKg,
      };
    }

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

    // Abuse Prevention: Customer cannot refer themselves (by mobile OR email)
    if (offer.referrerCustomer) {
      const cleanCustomerMobile = (customerMobile || '').replace(/\D/g, '').slice(-10);
      const cleanReferrerMobile = (offer.referrerCustomer.mobile || '').replace(/\D/g, '').slice(-10);
      const cleanCustomerEmail = (customerEmail || '').trim().toLowerCase();
      const cleanReferrerEmail = (offer.referrerCustomer.email || '').trim().toLowerCase();

      const sameMobile = Boolean(cleanCustomerMobile && cleanReferrerMobile && cleanCustomerMobile === cleanReferrerMobile);
      const sameEmail = Boolean(
        cleanCustomerEmail &&
        cleanReferrerEmail &&
        !cleanCustomerEmail.endsWith('@kamadhenuhoneyfarms.in') &&
        cleanCustomerEmail === cleanReferrerEmail
      );

      if (sameMobile || sameEmail) {
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
