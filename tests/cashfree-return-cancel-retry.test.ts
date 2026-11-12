import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  getCashfreeOrderPaymentsMock,
  getCashfreeOrderMock,
  notifyAdminNewOrderMock,
  notifyCustomerOrderConfirmedMock,
  notifyCustomerPaymentFailedMock,
} = vi.hoisted(() => ({
  prismaMock: {
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    referralOffer: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    referralUsage: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    referralReward: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    adminNotification: {
      upsert: vi.fn(),
    },
    customer: {
      update: vi.fn(),
    },
    customerSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  getCashfreeOrderPaymentsMock: vi.fn(),
  getCashfreeOrderMock: vi.fn(),
  notifyAdminNewOrderMock: vi.fn(async () => {}),
  notifyCustomerOrderConfirmedMock: vi.fn(async () => {}),
  notifyCustomerPaymentFailedMock: vi.fn(async () => {}),
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/notifications', () => ({
  notifyAdminNewOrder: notifyAdminNewOrderMock,
  notifyCustomerOrderConfirmed: notifyCustomerOrderConfirmedMock,
  notifyCustomerPaymentFailed: notifyCustomerPaymentFailedMock,
}));
vi.mock('@/lib/ownerNotification', () => ({
  notifyOwnerNewOrder: vi.fn(async () => {}),
}));
vi.mock('@/lib/cashfree', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cashfree')>('@/lib/cashfree');
  return {
    ...actual,
    getCashfreeConfig: () => ({
      clientId: 'cf_test_app',
      clientSecret: 'cf_test_secret',
      env: 'sandbox',
      baseUrl: 'https://sandbox.cashfree.com/pg',
      apiVersion: '2023-08-01',
    }),
    getCashfreeOrderPayments: getCashfreeOrderPaymentsMock,
    getCashfreeOrder: getCashfreeOrderMock,
  };
});

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';

import { GET as cashfreeReturnGet } from '@/app/api/checkout/return/route';
import { POST as checkoutVerifyPost } from '@/app/api/checkout/verify/route';
import { POST as retryOrderPost } from '@/app/api/checkout/retry-order/route';
import { signOrderAccessToken } from '@/lib/customerAuth';

function makePendingOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'ord_cf_1',
    orderNumber: 'KHF-ORD-CF1',
    customerId: 'cust_cf_1',
    total: 1000,
    subtotal: 1000,
    shippingFee: 0,
    discount: 0,
    advanceAmount: 0,
    advancePaidAmount: 0,
    codRemainingAmount: 0,
    currency: 'INR',
    paymentMethod: 'CASHFREE',
    paymentStatus: 'PAYMENT_PENDING',
    orderStatus: 'NEW',
    cashfreeOrderId: 'KHF-ORD-CF1',
    referralCode: null,
    customer: {
      id: 'cust_cf_1',
      name: 'Meera',
      mobile: '9876543210',
      email: 'meera@example.com',
    },
    items: [
      {
        id: 'oi_1',
        productId: 'p1',
        productNameSnapshot: 'Pure Raw Forest Honey',
        weightVariant: '1kg',
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
      },
    ],
    shippingAddress: {
      addressLine1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
    payments: [],
    shipments: [],
    ...overrides,
  };
}

describe('Cashfree Return, Cancellation, Failure, Pending & Retry Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
  });

  it('treats USER_DROPPED / empty Cashfree attempts as CANCELLED and redirects return_url to checkout (not verification page)', async () => {
    const order = makePendingOrder();
    prismaMock.order.findFirst.mockResolvedValue(order);
    getCashfreeOrderPaymentsMock.mockResolvedValue([]);
    getCashfreeOrderMock.mockResolvedValue({
      order_id: 'KHF-ORD-CF1',
      order_status: 'ACTIVE',
      payment_session_id: 'sess_123',
    });

    const token = signOrderAccessToken('KHF-ORD-CF1', 'cust_cf_1');

    // 1. /api/checkout/verify returns CANCELLED (never PAID or PENDING)
    const verifyReq = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/checkout/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'KHF-ORD-CF1', token }),
    });
    const verifyRes = await checkoutVerifyPost(verifyReq);
    expect(verifyRes.status).toBe(400);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBe(false);
    expect(verifyJson.cancelled).toBe(true);
    expect(verifyJson.status).toBe('CANCELLED');
    expect(verifyJson.message).toBe('Payment cancelled. No payment was completed. You can try again.');

    // 2. /api/checkout/return ignores forged ?status=confirmed and redirects to /?checkoutStatus=cancelled
    const returnReq = new NextRequest(
      `https://www.kamadhenuhoneyfarms.in/api/checkout/return?orderNumber=KHF-ORD-CF1&status=confirmed&token=${encodeURIComponent(token)}`
    );
    const returnRes = await cashfreeReturnGet(returnReq);
    expect(returnRes.status).toBe(302);
    const location = new URL(returnRes.headers.get('location') || '');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.get('checkoutStatus')).toBe('cancelled');
    expect(location.searchParams.get('orderNumber')).toBe('KHF-ORD-CF1');
  });

  it('marks FAILED attempts as FAILED and redirects return_url to /?checkoutStatus=failed', async () => {
    const order = makePendingOrder();
    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.adminNotification.upsert.mockResolvedValue({ id: 'notif_fail_1' });
    getCashfreeOrderPaymentsMock.mockResolvedValue([
      {
        cf_payment_id: 'cf_fail_1',
        payment_status: 'FAILED',
        payment_message: 'Bank declined transaction',
        payment_time: new Date().toISOString(),
      },
    ]);

    const token = signOrderAccessToken('KHF-ORD-CF1', 'cust_cf_1');
    const returnReq = new NextRequest(
      `https://www.kamadhenuhoneyfarms.in/api/checkout/return?orderNumber=KHF-ORD-CF1&token=${encodeURIComponent(token)}`
    );
    const returnRes = await cashfreeReturnGet(returnReq);
    expect(returnRes.status).toBe(302);
    const location = new URL(returnRes.headers.get('location') || '');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.get('checkoutStatus')).toBe('failed');
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { paymentStatus: 'FAILED' },
      })
    );
  });

  it('keeps PENDING payments pending and routes return_url to /order-confirmation?status=pending', async () => {
    const order = makePendingOrder();
    prismaMock.order.findFirst.mockResolvedValue(order);
    getCashfreeOrderPaymentsMock.mockResolvedValue([
      {
        cf_payment_id: 'cf_pend_1',
        payment_status: 'PENDING',
        payment_time: new Date().toISOString(),
      },
    ]);

    const token = signOrderAccessToken('KHF-ORD-CF1', 'cust_cf_1');

    const verifyReq = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/checkout/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'KHF-ORD-CF1', token }),
    });
    const verifyRes = await checkoutVerifyPost(verifyReq);
    expect(verifyRes.status).toBe(202);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.pending).toBe(true);
    expect(verifyJson.status).toBe('PENDING');

    const returnReq = new NextRequest(
      `https://www.kamadhenuhoneyfarms.in/api/checkout/return?orderNumber=KHF-ORD-CF1&token=${encodeURIComponent(token)}`
    );
    const returnRes = await cashfreeReturnGet(returnReq);
    expect(returnRes.status).toBe(302);
    const location = new URL(returnRes.headers.get('location') || '');
    expect(location.pathname).toBe('/order-confirmation');
    expect(location.searchParams.get('status')).toBe('pending');
  });

  it('settles SUCCESS payment on return_url and redirects to /order-confirmation', async () => {
    const order = makePendingOrder();
    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({ id: 'pay_ok_1' });
    prismaMock.adminNotification.upsert.mockResolvedValue({ id: 'notif_ok_1' });
    prismaMock.customer.update.mockResolvedValue({ id: 'cust_cf_1' });
    prismaMock.order.findUnique.mockResolvedValue({
      ...order,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
    });
    prismaMock.order.count.mockResolvedValue(1);
    getCashfreeOrderPaymentsMock.mockResolvedValue([
      {
        cf_payment_id: 'cf_ok_1',
        payment_status: 'SUCCESS',
        payment_amount: 1000,
        payment_currency: 'INR',
        payment_method: { upi: {} },
        payment_completion_time: new Date().toISOString(),
      },
    ]);

    const token = signOrderAccessToken('KHF-ORD-CF1', 'cust_cf_1');
    const returnReq = new NextRequest(
      `https://www.kamadhenuhoneyfarms.in/api/checkout/return?orderNumber=KHF-ORD-CF1&token=${encodeURIComponent(token)}`
    );
    const returnRes = await cashfreeReturnGet(returnReq);
    expect(returnRes.status).toBe(302);
    const location = new URL(returnRes.headers.get('location') || '');
    expect(location.pathname).toBe('/order-confirmation');
    expect(location.searchParams.get('orderNumber')).toBe('KHF-ORD-CF1');
    expect(location.searchParams.get('status')).toBeNull();
  });

  it('reuses existing unpaid order & Cashfree session on retry without creating duplicate orders', async () => {
    const order = makePendingOrder({
      paymentStatus: 'FAILED',
      total: 1498,
      items: [
        {
          id: 'oi_1',
          productId: 'p1',
          productNameSnapshot: 'Pure Raw Honey',
          weightVariant: '1kg',
          quantity: 2,
          unitPrice: 749,
          totalPrice: 1498,
        },
      ],
    });
    prismaMock.order.findFirst.mockResolvedValue(order);
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    getCashfreeOrderPaymentsMock.mockResolvedValue([
      {
        cf_payment_id: 'cf_drop_1',
        payment_status: 'USER_DROPPED',
        payment_time: new Date().toISOString(),
      },
    ]);
    getCashfreeOrderMock.mockResolvedValue({
      order_id: 'KHF-ORD-CF1',
      order_status: 'ACTIVE',
      payment_session_id: 'session_reused_123',
    });

    const token = signOrderAccessToken('KHF-ORD-CF1', 'cust_cf_1');
    const retryReq = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/checkout/retry-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderNumber: 'KHF-ORD-CF1',
        token,
        pincode: '560038',
        mobile: '9876543210',
        paymentMethod: 'cashfree',
        items: [{ productId: 'p1', weightVariant: '1kg', quantity: 2 }],
      }),
    });

    const retryRes = await retryOrderPost(retryReq);
    expect(retryRes.status).toBe(200);
    const retryJson = await retryRes.json();
    expect(retryJson.success).toBe(true);
    expect(retryJson.reused).toBe(true);
    expect(retryJson.orderNumber).toBe('KHF-ORD-CF1');
    expect(retryJson.paymentSessionId).toBe('session_reused_123');
  });
});
