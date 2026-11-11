import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, createCashfreeOrderMock } = vi.hoisted(() => ({
  prismaMock: {
    productInventory: {
      findMany: vi.fn(),
    },
    referralOffer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    referralReward: {
      findUnique: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    orderItem: {
      createMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    customerSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  createCashfreeOrderMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/cashfree', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cashfree')>('@/lib/cashfree');
  return {
    ...actual,
    createCashfreeOrder: createCashfreeOrderMock,
    getCashfreeConfig: () => ({
      env: 'SANDBOX',
      appId: 'test_app_id',
      secretKey: 'test_secret_key',
      baseUrl: 'https://sandbox.cashfree.com/pg',
      apiVersion: '2023-08-01',
    }),
  };
});

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';

import { POST as createOrderPost } from '@/app/api/checkout/create-order/route';
import { calculateShippingCharge } from '@/lib/shipping';
import { validateDiscountOrReferralCode } from '@/lib/referral';
import { CUSTOMER_COOKIE_NAME, ORDER_ACCESS_COOKIE_NAME } from '@/lib/customerAuth';

function makeCheckoutBody(overrides: Record<string, any> = {}) {
  return {
    name: 'Aarav Sharma',
    mobile: '9876543210',
    email: 'aarav@example.com',
    addressLine1: '12, MG Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    items: [{ productId: 'p1', weightVariant: '1kg', quantity: 2 }],
    paymentMethod: 'ONLINE',
    // Malicious client-tampered pricing fields (must be ignored by server)
    subtotal: 1,
    total: 1,
    discount: 999,
    shippingFee: 0,
    ...overrides,
  };
}

describe('Checkout Pricing, Stock, Shipping & Referral Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.productInventory.findMany.mockResolvedValue([
      { id: 'p1', stockStatus: 'IN_STOCK', canPreorder: true },
    ]);
    prismaMock.referralOffer.findFirst.mockResolvedValue(null);
    prismaMock.referralOffer.findUnique.mockResolvedValue(null);
    prismaMock.referralReward.findUnique.mockResolvedValue(null);
    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({
      id: 'cust_new_1',
      name: 'Aarav Sharma',
      mobile: '9876543210',
      email: 'aarav@example.com',
      rewardPoints: 0,
      hasCompletedOrder: false,
    });
    prismaMock.address.findFirst.mockResolvedValue(null);
    prismaMock.address.create.mockResolvedValue({ id: 'addr_1' });
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
    prismaMock.order.create.mockImplementation(async ({ data }: any) => ({
      id: 'ord_db_1',
      ...data,
    }));
    prismaMock.order.update.mockResolvedValue({ id: 'ord_db_1' });
    prismaMock.customerSession.create.mockResolvedValue({ token: 'sess_tok_new_1' });
  });

  it('rejects OUT_OF_STOCK and non-preorderable RESTOCKING_SOON items', async () => {
    prismaMock.productInventory.findMany.mockResolvedValueOnce([
      { id: 'p1', stockStatus: 'OUT_OF_STOCK', canPreorder: false },
    ]);

    const reqOut = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
      body: JSON.stringify(makeCheckoutBody()),
    });
    const resOut = await createOrderPost(reqOut);
    expect(resOut.status).toBe(400);
    const jsonOut = await resOut.json();
    expect(jsonOut.message).toMatch(/out of stock/i);

    prismaMock.productInventory.findMany.mockResolvedValueOnce([
      { id: 'p1', stockStatus: 'RESTOCKING_SOON', canPreorder: false },
    ]);
    const reqRestock = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.11' },
      body: JSON.stringify(makeCheckoutBody()),
    });
    const resRestock = await createOrderPost(reqRestock);
    expect(resRestock.status).toBe(400);
    expect((await resRestock.json()).message).toMatch(/restocking/i);
  });

  it('rejects tampered product variant and invalid quantities', async () => {
    const reqInvalidQty = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.12' },
      body: JSON.stringify(makeCheckoutBody({ items: [{ productId: 'p1', weightVariant: '1kg', quantity: 0 }] })),
    });
    expect((await createOrderPost(reqInvalidQty)).status).toBe(400);

    const reqInvalidVariant = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.13' },
      body: JSON.stringify(makeCheckoutBody({ items: [{ productId: 'p1', weightVariant: '999kg', quantity: 1 }] })),
    });
    expect((await createOrderPost(reqInvalidVariant)).status).toBe(400);
  });

  it('computes authoritative server-side totals regardless of browser-tampered total/subtotal/price', async () => {
    createCashfreeOrderMock.mockResolvedValue({
      order_id: 'KHF-ORD-MOCK-1',
      payment_session_id: 'session_abc_123',
      cf_order_id: 'cf_123',
    });

    // p1 (Pure Raw Honey 1kg) = Rs 749 * 2 = Rs 1498. Total >= Rs 999 in Karnataka -> Free shipping (0).
    const req = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.14' },
      body: JSON.stringify(
        makeCheckoutBody({
          items: [{ productId: 'p1', weightVariant: '1kg', quantity: 2, unitPrice: 1, price: 1 }],
        })
      ),
    });

    const res = await createOrderPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Server must compute 1498 instead of tampered 1
    expect(data.amount).toBe(1498);
    expect(data.finalTotal).toBe(1498);
    expect(data.orderAccessToken).toBeTruthy();

    // Cashfree order created for 1498
    expect(createCashfreeOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderAmount: 1498,
        orderCurrency: 'INR',
      })
    );
  });

  it('cancels dangling pending DB order when Cashfree initiation fails', async () => {
    createCashfreeOrderMock.mockRejectedValueOnce(new Error('Cashfree timeout'));

    const req = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.15' },
      body: JSON.stringify(makeCheckoutBody()),
    });

    const res = await createOrderPost(req);
    expect(res.status).toBe(500);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord_db_1' },
        data: expect.objectContaining({
          orderStatus: 'CANCELLED',
          paymentStatus: 'FAILED',
        }),
      })
    );
  });

  it('does NOT issue existing customer session cookie to unauthenticated checkout caller', async () => {
    createCashfreeOrderMock.mockResolvedValue({
      order_id: 'KHF-ORD-MOCK-2',
      payment_session_id: 'session_existing_cust',
      cf_order_id: 'cf_456',
    });

    prismaMock.customer.findFirst.mockResolvedValueOnce({
      id: 'cust_victim_99',
      name: 'Victim Customer',
      mobile: '9876543210',
      email: 'victim@example.com',
      hasCompletedOrder: true,
    });

    const req = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.16' },
      body: JSON.stringify(makeCheckoutBody()),
    });

    const res = await createOrderPost(req);
    expect(res.status).toBe(200);
    // Order-scoped cookie MUST be set, but full victim account cookie must NOT be minted
    expect(res.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value).toBeTruthy();
    expect(res.cookies.get(CUSTOMER_COOKIE_NAME)).toBeUndefined();
  });

  it('blocks test pincode 000000 in production while computing Karnataka vs outside-state rates accurately', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const testRes = await calculateShippingCharge(
        '000000',
        [{ productId: 'p1', weightVariant: '500g', quantity: 1 }],
        500
      );
      expect(testRes.serviceable).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }

    const freeKa = await calculateShippingCharge(
      '560038',
      [{ productId: 'p1', weightVariant: '1kg', quantity: 2 }],
      1200
    );
    expect(freeKa.serviceable).toBe(true);
    expect(freeKa.shippingFee).toBe(0);

    const subsidizedOut = await calculateShippingCharge(
      '400001',
      [{ productId: 'p1', weightVariant: '1kg', quantity: 2 }],
      1200
    );
    expect(subsidizedOut.serviceable).toBe(true);
    expect(subsidizedOut.shippingFee).toBe(99);
  });

  it('blocks self-referral abuse by email or mobile and enforces minimum kg weight rules', async () => {
    prismaMock.referralOffer.findUnique.mockResolvedValueOnce({
      id: 'ref_1',
      code: 'SELF100',
      type: 'REFERRAL',
      discountType: 'FIXED',
      discountValue: 100,
      minOrderAmount: 0,
      minWeightKg: 1,
      isActive: true,
      expiresAt: null,
      usageLimit: null,
      timesUsed: 0,
      referrerCustomer: {
        mobile: '9999988888',
        email: 'owner@example.com',
      },
    });

    // Self-referral detected by email even when caller uses a different mobile
    const selfRes = await validateDiscountOrReferralCode(
      'SELF100',
      1500,
      [{ productId: 'p1', weightVariant: '1kg', quantity: 2 }],
      '9111122222',
      'OWNER@example.com'
    );
    expect(selfRes.valid).toBe(false);
    expect(selfRes.message).toMatch(/own owner|own referral/i);

    // Min weight kg enforced
    prismaMock.referralOffer.findUnique.mockResolvedValueOnce({
      id: 'ref_1',
      code: 'MIN2KG',
      discountPercent: 10,
      minPurchaseKg: 2,
      isActive: true,
      expiryDate: null,
      usageLimit: null,
      timesUsed: 0,
      referrerCustomer: null,
    });
    const weightRes = await validateDiscountOrReferralCode(
      'MIN2KG',
      749,
      [{ productId: 'p1', weightVariant: '1kg', quantity: 1 }]
    );
    expect(weightRes.valid).toBe(false);
    expect(weightRes.message).toMatch(/2kg/i);
  });

  it('prevents duplicate checkout submissions with identical x-idempotency-key and releases lock on failure', async () => {
    const idemKey = `idem_test_${Date.now()}`;
    createCashfreeOrderMock.mockResolvedValueOnce({
      order_id: 'KHF-ORD-IDEM',
      payment_session_id: 'sess_idem_1',
    });

    const firstReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.77',
        'x-idempotency-key': idemKey,
      },
      body: JSON.stringify(makeCheckoutBody()),
    });
    const firstRes = await createOrderPost(firstReq);
    expect(firstRes.status).toBe(200);

    // Rapid duplicate click with same idempotency key must be blocked with 409 Conflict
    const dupReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.77',
        'x-idempotency-key': idemKey,
      },
      body: JSON.stringify(makeCheckoutBody()),
    });
    const dupRes = await createOrderPost(dupReq);
    expect(dupRes.status).toBe(409);

    // Failed gateway initiation releases the idempotency lock so customer can retry cleanly
    const retryKey = `idem_retry_${Date.now()}`;
    createCashfreeOrderMock.mockRejectedValueOnce(new Error('Transient gateway timeout'));
    const failedReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.78',
        'x-idempotency-key': retryKey,
      },
      body: JSON.stringify(makeCheckoutBody()),
    });
    expect((await createOrderPost(failedReq)).status).toBe(500);

    createCashfreeOrderMock.mockResolvedValueOnce({
      order_id: 'KHF-ORD-RETRY-OK',
      payment_session_id: 'sess_retry_ok',
    });
    const retryOkReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.78',
        'x-idempotency-key': retryKey,
      },
      body: JSON.stringify(makeCheckoutBody()),
    });
    expect((await createOrderPost(retryOkReq)).status).toBe(200);
  });
});
