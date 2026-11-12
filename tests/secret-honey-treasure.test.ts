import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    referralOffer: {
      findUnique: vi.fn(),
    },
    referralReward: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { PRODUCTS, AUTHORITATIVE_PRICES } from '@/lib/products';
import {
  STATIC_VALID_COUPONS,
  calculateEligibleSubtotal,
  validateDiscountOrReferralCode,
} from '@/lib/referral';
import { POST as validateReferralPost } from '@/app/api/referrals/validate/route';

describe('Secret Honey Treasure (KHF-OFF) Promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.referralOffer.findUnique.mockResolvedValue(null);
    prismaMock.referralReward.findUnique.mockResolvedValue(null);
  });

  it('preserves approved product names, sizes, and prices with p4 named Honey Cake', () => {
    expect(PRODUCTS.p1.name).toBe('Pure Raw Honey');
    expect(PRODUCTS.p1.prices).toEqual({ '250g': 250, '500g': 399, '1kg': 749 });

    expect(PRODUCTS.p2.name).toBe('Dry Fruits Honey');
    expect(PRODUCTS.p2.prices).toEqual({ '250g': 399, '500g': 599, '1kg': 999 });

    expect(PRODUCTS.p3.name).toBe('Bee-Crafted Honey Comb Jar');
    expect(PRODUCTS.p3.prices).toEqual({ '500g': 599 });
    expect(PRODUCTS.p3.prices['250g']).toBeUndefined();

    expect(PRODUCTS.p4.name).toBe('Honey Cake');
    expect(AUTHORITATIVE_PRICES.p4.name).toBe('Honey Cake');
    expect(PRODUCTS.p4.prices).toEqual({ '500g': 899 });
    expect(PRODUCTS.p4.prices['250g']).toBeUndefined();
  });

  it('configures KHF-OFF as 5% OFF restricted strictly to p1 and p2', () => {
    expect(STATIC_VALID_COUPONS['KHF-OFF']).toEqual({
      type: 'percent',
      value: 5,
      eligibleProductIds: ['p1', 'p2'],
    });
  });

  it('applies 5% OFF accurately for p1 (Pure Raw Honey) and p2 (Dry Fruits Honey)', async () => {
    const p1Res = await validateDiscountOrReferralCode('khf-off', 399, [
      { productId: 'p1', weightVariant: '500g', quantity: 1 },
    ]);
    expect(p1Res.valid).toBe(true);
    expect(p1Res.code).toBe('KHF-OFF');
    expect(p1Res.eligibleSubtotal).toBe(399);
    expect(p1Res.calculatedDiscount).toBe(20); // Math.round(399 * 0.05)

    const p2Res = await validateDiscountOrReferralCode('KHF-OFF', 999, [
      { productId: 'p2', weightVariant: '1kg', quantity: 1 },
    ]);
    expect(p2Res.valid).toBe(true);
    expect(p2Res.eligibleSubtotal).toBe(999);
    expect(p2Res.calculatedDiscount).toBe(50); // Math.round(999 * 0.05)

    const bothRes = await validateDiscountOrReferralCode('KHF-OFF', 998, [
      { productId: 'p1', weightVariant: '500g', quantity: 1 },
      { productId: 'p2', weightVariant: '500g', quantity: 1 },
    ]);
    expect(bothRes.valid).toBe(true);
    expect(bothRes.eligibleSubtotal).toBe(998);
    expect(bothRes.calculatedDiscount).toBe(50); // Math.round(998 * 0.05)
  });

  it('rejects KHF-OFF when cart contains only excluded products (p3 and/or p4)', async () => {
    const p3Only = await validateDiscountOrReferralCode('KHF-OFF', 599, [
      { productId: 'p3', weightVariant: '500g', quantity: 1 },
    ]);
    expect(p3Only.valid).toBe(false);
    expect(p3Only.calculatedDiscount).toBe(0);
    expect(p3Only.eligibleSubtotal).toBe(0);
    expect(p3Only.message).toContain('Pure Raw Honey');
    expect(p3Only.message).toContain('Dry Fruits Honey');

    const p4Only = await validateDiscountOrReferralCode('KHF-OFF', 899, [
      { productId: 'p4', weightVariant: '500g', quantity: 1 },
    ]);
    expect(p4Only.valid).toBe(false);
    expect(p4Only.calculatedDiscount).toBe(0);
    expect(p4Only.message).toContain('Honey Cake');

    const p3AndP4 = await validateDiscountOrReferralCode('KHF-OFF', 1498, [
      { productId: 'p3', weightVariant: '500g', quantity: 1 },
      { productId: 'p4', weightVariant: '500g', quantity: 1 },
    ]);
    expect(p3AndP4.valid).toBe(false);
    expect(p3AndP4.calculatedDiscount).toBe(0);
  });

  it('calculates 5% discount ONLY on p1 and p2 subtotal in mixed carts', async () => {
    const mixedRes = await validateDiscountOrReferralCode('KHF-OFF', 1897, [
      { productId: 'p1', weightVariant: '500g', quantity: 1 }, // 399 (eligible)
      { productId: 'p3', weightVariant: '500g', quantity: 1 }, // 599 (excluded)
      { productId: 'p4', weightVariant: '500g', quantity: 1 }, // 899 (excluded)
    ]);

    expect(mixedRes.valid).toBe(true);
    expect(mixedRes.eligibleSubtotal).toBe(399);
    expect(mixedRes.calculatedDiscount).toBe(20); // 5% of 399 only, NOT 5% of 1897 (95)
    expect(mixedRes.message).toContain('Pure Raw Honey & Dry Fruits Honey items only');
  });

  it('uses authoritative server prices rather than tampered client unitPrice', () => {
    const eligible = calculateEligibleSubtotal(
      [
        { productId: 'p1', weightVariant: '500g', quantity: 1, unitPrice: 99999 },
        { productId: 'p4', weightVariant: '500g', quantity: 2, unitPrice: 99999 },
      ],
      ['p1', 'p2']
    );
    expect(eligible).toBe(399);
  });

  it('rejects unknown coupon codes cleanly', async () => {
    const invalidRes = await validateDiscountOrReferralCode('INVALID-CODE', 1000, [
      { productId: 'p1', weightVariant: '1kg', quantity: 1 },
    ]);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.calculatedDiscount).toBe(0);
  });

  it('enforces two-product eligibility via POST /api/referrals/validate', async () => {
    const reqMixed = new NextRequest('http://localhost/api/referrals/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'KHF-OFF',
        subtotal: 1498,
        items: [
          { productId: 'p2', weightVariant: '500g', quantity: 1 }, // 599
          { productId: 'p4', weightVariant: '500g', quantity: 1 }, // 899
        ],
      }),
    });
    const resMixed = await validateReferralPost(reqMixed);
    const dataMixed = await resMixed.json();
    expect(resMixed.status).toBe(200);
    expect(dataMixed.valid).toBe(true);
    expect(dataMixed.eligibleSubtotal).toBe(599);
    expect(dataMixed.calculatedDiscount).toBe(30); // Math.round(599 * 0.05)

    const reqExcluded = new NextRequest('http://localhost/api/referrals/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'KHF-OFF',
        subtotal: 899,
        items: [{ productId: 'p4', weightVariant: '500g', quantity: 1 }],
      }),
    });
    const resExcluded = await validateReferralPost(reqExcluded);
    const dataExcluded = await resExcluded.json();
    expect(resExcluded.status).toBe(200);
    expect(dataExcluded.valid).toBe(false);
    expect(dataExcluded.calculatedDiscount).toBe(0);
  });
});
