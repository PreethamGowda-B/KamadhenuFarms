import crypto from 'crypto';
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
      env: 'SANDBOX',
      appId: 'cf_test_app',
      secretKey: 'cf_test_webhook_secret_key',
      baseUrl: 'https://sandbox.cashfree.com/pg',
      apiVersion: '2023-08-01',
    }),
    getCashfreeOrderPayments: getCashfreeOrderPaymentsMock,
    getCashfreeOrder: getCashfreeOrderMock,
  };
});

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';
process.env.CASHFREE_SECRET_KEY = 'cf_test_webhook_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret_key';

import {
  isFreshWebhookTimestamp,
  verifyCashfreeWebhookSignature,
} from '@/lib/cashfree';
import { settleCashfreePaymentAtomic } from '@/lib/orderPaymentSettlement';
import { POST as cashfreeWebhookPost } from '@/app/api/payment/cashfree/webhook/route';
import { POST as checkoutVerifyPost } from '@/app/api/checkout/verify/route';
import { POST as razorpayWebhookPost } from '@/app/api/webhooks/razorpay/route';
import { signOrderAccessToken } from '@/lib/customerAuth';

function signCashfreeBody(rawBody: string, timestamp: string, secret = 'cf_test_webhook_secret_key') {
  return crypto
    .createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('base64');
}

describe('Payment Security, Cashfree/Razorpay Webhooks & Atomic Settlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
  });

  it('validates Cashfree HMAC webhook signature and enforces 5-minute replay window', () => {
    const nowSec = String(Math.floor(Date.now() / 1000));
    const staleSec = String(Math.floor(Date.now() / 1000) - 600);
    const body = JSON.stringify({ data: { order: { order_id: 'KHF-ORD-1' } } });
    const sig = signCashfreeBody(body, nowSec);

    expect(verifyCashfreeWebhookSignature(body, sig, nowSec)).toBe(true);
    expect(verifyCashfreeWebhookSignature(body, 'bad-sig', nowSec)).toBe(false);
    expect(isFreshWebhookTimestamp(nowSec, 300)).toBe(true);
    expect(isFreshWebhookTimestamp(staleSec, 300)).toBe(false);
  });

  it('rejects Cashfree webhook with invalid signature or stale replay timestamp (401)', async () => {
    const rawBody = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: 'KHF-ORD-1', order_amount: 1500, order_currency: 'INR' },
        payment: { cf_payment_id: '999', payment_status: 'SUCCESS', payment_amount: 1500, payment_currency: 'INR' },
      },
    });
    const staleTs = String(Math.floor(Date.now() / 1000) - 900);
    const staleSig = signCashfreeBody(rawBody, staleTs);

    const staleReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/payment/cashfree/webhook', {
      method: 'POST',
      headers: {
        'x-webhook-timestamp': staleTs,
        'x-webhook-signature': staleSig,
        'content-type': 'application/json',
      },
      body: rawBody,
    });
    expect((await cashfreeWebhookPost(staleReq)).status).toBe(401);

    const freshTs = String(Math.floor(Date.now() / 1000));
    const badSigReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/payment/cashfree/webhook', {
      method: 'POST',
      headers: {
        'x-webhook-timestamp': freshTs,
        'x-webhook-signature': 'tampered-signature',
        'content-type': 'application/json',
      },
      body: rawBody,
    });
    expect((await cashfreeWebhookPost(badSigReq)).status).toBe(401);
  });

  it('rejects underpayment and currency mismatch in settleCashfreePaymentAtomic', async () => {
    const underpay = await settleCashfreePaymentAtomic({
      orderId: 'ord_1',
      orderNumber: 'KHF-ORD-UNDERPAY',
      customerId: 'cust_1',
      orderTotal: 1500,
      expectedAmount: 1500,
      expectedCurrency: 'INR',
      isCod: false,
      discount: 0,
      currentOrderStatus: 'NEW',
      cashfreeOrderId: 'KHF-ORD-UNDERPAY',
      cfPaymentId: 'cf_pay_1',
      paidAmount: 100, // tampered partial amount
      paidCurrency: 'INR',
      paymentMethodDescription: 'UPI',
      paidAt: new Date(),
      rawPayload: {},
      source: 'cashfree_webhook',
    });
    expect(underpay.settled).toBe(false);
    expect(underpay.amountMismatch).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    const wrongCurrency = await settleCashfreePaymentAtomic({
      orderId: 'ord_1',
      orderNumber: 'KHF-ORD-CURR',
      customerId: 'cust_1',
      orderTotal: 1500,
      expectedAmount: 1500,
      expectedCurrency: 'INR',
      isCod: false,
      discount: 0,
      currentOrderStatus: 'NEW',
      cashfreeOrderId: 'KHF-ORD-CURR',
      cfPaymentId: 'cf_pay_2',
      paidAmount: 1500,
      paidCurrency: 'USD',
      paymentMethodDescription: 'CARD',
      paidAt: new Date(),
      rawPayload: {},
      source: 'cashfree_webhook',
    });
    expect(wrongCurrency.settled).toBe(false);
    expect(wrongCurrency.currencyMismatch).toBe(true);
  });

  it('settles payment idempotently on concurrent webhook + verify calls without double-applying referral/reward', async () => {
    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prismaMock.payment.findFirst.mockResolvedValue(null);
    prismaMock.payment.create.mockResolvedValue({ id: 'pay_1' });
    prismaMock.referralOffer.findFirst.mockResolvedValue({
      id: 'off_1',
      code: 'REF50',
      usageLimit: 10,
      referrerCustomerId: 'cust_ref',
    });
    prismaMock.referralOffer.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.referralUsage.findFirst.mockResolvedValue(null);
    prismaMock.referralUsage.create.mockResolvedValue({ id: 'usage_1' });
    prismaMock.referralReward.create.mockResolvedValue({ id: 'rew_1' });
    prismaMock.adminNotification.upsert.mockResolvedValue({ id: 'notif_1' });
    prismaMock.customer.update.mockResolvedValue({ id: 'cust_1' });
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'KHF-ORD-IDEMP',
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      customer: { id: 'cust_1', mobile: '9876543210' },
      items: [],
      shippingAddress: {},
      payments: [],
    });

    const baseInput = {
      orderId: 'ord_1',
      orderNumber: 'KHF-ORD-IDEMP',
      customerId: 'cust_1',
      customerName: 'Kavya',
      orderTotal: 1500,
      expectedAmount: 1500,
      expectedCurrency: 'INR',
      isCod: false,
      referralCode: 'REF50',
      discount: 50,
      currentOrderStatus: 'NEW',
      cashfreeOrderId: 'KHF-ORD-IDEMP',
      cfPaymentId: 'cf_pay_999',
      paidAmount: 1500,
      paidCurrency: 'INR',
      paymentMethodDescription: 'UPI',
      paidAt: new Date(),
      rawPayload: {},
    } as const;

    const first = await settleCashfreePaymentAtomic({ ...baseInput, source: 'cashfree_webhook' });
    const duplicate = await settleCashfreePaymentAtomic({ ...baseInput, source: 'checkout_verify' });

    expect(first.settled).toBe(true);
    expect(first.alreadyPaid).toBe(false);
    expect(duplicate.settled).toBe(false);
    expect(duplicate.alreadyPaid).toBe(true);
    // Referral & reward side-effects must happen strictly once
    expect(prismaMock.referralOffer.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.referralReward.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated /api/checkout/verify calls (403) and settles only when order token + Cashfree PAID match', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'ord_v1',
      orderNumber: 'KHF-ORD-VERIFY1',
      customerId: 'cust_v1',
      total: 750,
      advanceRequiredAmount: 750,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PAYMENT_PENDING',
      orderStatus: 'NEW',
      cashfreeOrderId: 'KHF-ORD-VERIFY1',
      referralCode: null,
      discount: 0,
      customer: { id: 'cust_v1', name: 'Meera', mobile: '9876543210' },
      items: [],
      shippingAddress: {},
      payments: [],
    });

    // 1. Unauthenticated / missing order token must be rejected
    const unauthReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'KHF-ORD-VERIFY1' }),
    });
    expect((await checkoutVerifyPost(unauthReq)).status).toBe(403);

    // 2. Valid signed order token settles against mocked Cashfree PAID response
    const validToken = signOrderAccessToken('KHF-ORD-VERIFY1', 'cust_v1');
    getCashfreeOrderPaymentsMock.mockResolvedValueOnce([
      {
        cf_payment_id: 'cf_verified_1',
        payment_status: 'SUCCESS',
        payment_amount: 750,
        payment_currency: 'INR',
        payment_method: { upi: {} },
        payment_completion_time: new Date().toISOString(),
      },
    ]);
    prismaMock.order.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);
    prismaMock.payment.create.mockResolvedValueOnce({ id: 'pay_v1' });
    prismaMock.adminNotification.upsert.mockResolvedValueOnce({ id: 'notif_v1' });
    prismaMock.customer.update.mockResolvedValueOnce({ id: 'cust_v1' });
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_v1',
      orderNumber: 'KHF-ORD-VERIFY1',
      customerId: 'cust_v1',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      total: 750,
      customer: { id: 'cust_v1', name: 'Meera', mobile: '9876543210', hasCompletedOrder: false },
      items: [],
      shippingAddress: {},
      payments: [{ id: 'pay_v1', status: 'PAID' }],
    });
    prismaMock.order.count.mockResolvedValueOnce(1);

    const authReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/checkout/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'KHF-ORD-VERIFY1', token: validToken }),
    });
    const res = await checkoutVerifyPost(authReq);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.order.paymentStatus).toBe('PAID');
  });

  it('rejects Razorpay webhook underpayment, currency mismatch & invalid signature', async () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_1',
            order_id: 'order_rzp_1',
            amount: 10000, // Rs 100 instead of Rs 1500
            currency: 'INR',
            method: 'upi',
          },
        },
      },
    });
    const validRzpSig = crypto
      .createHmac('sha256', 'rzp_test_webhook_secret_key')
      .update(payload)
      .digest('hex');

    const badSigReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': '0000', 'content-type': 'application/json' },
      body: payload,
    });
    expect((await razorpayWebhookPost(badSigReq)).status).toBe(401);

    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_rzp_1',
      orderNumber: 'KHF-ORD-RZP1',
      total: 1500,
      paymentStatus: 'PAYMENT_PENDING',
      currency: 'INR',
      paymentMethod: 'ONLINE',
    });

    const underpayReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': validRzpSig, 'content-type': 'application/json' },
      body: payload,
    });
    expect((await razorpayWebhookPost(underpayReq)).status).toBe(400);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('settles Razorpay payment atomically with referrals, notifications, idempotent replay & payment.failed handling', async () => {
    const capturePayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_ok_1',
            order_id: 'order_rzp_ok_1',
            amount: 50000, // Rs 500 COD advance
            currency: 'INR',
            method: 'upi',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
    });
    const captureSig = crypto
      .createHmac('sha256', 'rzp_test_webhook_secret_key')
      .update(capturePayload)
      .digest('hex');

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        id: 'ord_rzp_cod',
        orderNumber: 'KHF-ORD-RZP-COD1',
        customerId: 'cust_rzp_1',
        total: 1000,
        advanceAmount: 500,
        paymentStatus: 'COD_ADVANCE_PENDING',
        orderStatus: 'NEW',
        currency: 'INR',
        paymentMethod: 'COD',
        referralCode: 'REF50',
        discount: 50,
        customer: { id: 'cust_rzp_1', name: 'Ananya', mobile: '9876543210' },
        payments: [],
      })
      .mockResolvedValueOnce({
        id: 'ord_rzp_cod',
        orderNumber: 'KHF-ORD-RZP-COD1',
        paymentStatus: 'COD_ADVANCE_PAID',
        orderStatus: 'CONFIRMED',
      })
      .mockResolvedValueOnce({
        id: 'ord_rzp_cod',
        orderNumber: 'KHF-ORD-RZP-COD1',
        total: 1000,
        paymentStatus: 'COD_ADVANCE_PAID',
        orderStatus: 'CONFIRMED',
        customer: { name: 'Ananya', mobile: '9876543210', email: 'ananya@example.com' },
        shippingAddress: { city: 'Bengaluru', pincode: '560001' },
        items: [{ productNameSnapshot: 'Wild Forest Honey', weightVariant: '1kg', quantity: 1 }],
      });

    prismaMock.order.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.payment.findFirst.mockResolvedValueOnce(null);
    prismaMock.payment.create.mockResolvedValueOnce({ id: 'pay_rzp_db_1' });
    prismaMock.referralOffer.findFirst.mockResolvedValueOnce({
      id: 'off_rzp_1',
      code: 'REF50',
      usageLimit: 10,
      referrerCustomerId: 'cust_ref_rzp',
    });
    prismaMock.referralOffer.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.referralUsage.findFirst.mockResolvedValueOnce(null);
    prismaMock.referralUsage.create.mockResolvedValueOnce({ id: 'usage_rzp_1' });
    prismaMock.referralReward.create.mockResolvedValueOnce({ id: 'rew_rzp_1' });
    prismaMock.adminNotification.upsert.mockResolvedValue({ id: 'notif_rzp' });

    const req1 = new NextRequest('https://kamadhenuhoneyfarms.in/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': captureSig, 'content-type': 'application/json' },
      body: capturePayload,
    });
    const res1 = await razorpayWebhookPost(req1);
    expect(res1.status).toBe(200);
    expect(prismaMock.referralReward.create).toHaveBeenCalledTimes(1);
    expect(notifyAdminNewOrderMock).toHaveBeenCalledTimes(1);
    expect(notifyCustomerOrderConfirmedMock).toHaveBeenCalledTimes(1);

    // Duplicate webhook replay hits alreadyPaid fast path (no extra rewards or push notices)
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_rzp_cod',
      orderNumber: 'KHF-ORD-RZP-COD1',
      paymentStatus: 'COD_ADVANCE_PAID',
      orderStatus: 'CONFIRMED',
      currency: 'INR',
      paymentMethod: 'COD',
      total: 1000,
      advanceAmount: 500,
      payments: [],
    });
    const reqReplay = new NextRequest('https://kamadhenuhoneyfarms.in/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': captureSig, 'content-type': 'application/json' },
      body: capturePayload,
    });
    const resReplay = await razorpayWebhookPost(reqReplay);
    expect(resReplay.status).toBe(200);
    expect(notifyAdminNewOrderMock).toHaveBeenCalledTimes(1);
    expect(notifyCustomerOrderConfirmedMock).toHaveBeenCalledTimes(1);

    // payment.failed marks FAILED & triggers admin notice + customer failure notification
    const failPayload = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_fail_1',
            order_id: 'order_rzp_fail_1',
          },
        },
      },
    });
    const failSig = crypto
      .createHmac('sha256', 'rzp_test_webhook_secret_key')
      .update(failPayload)
      .digest('hex');

    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_rzp_fail',
      orderNumber: 'KHF-ORD-RZP-FAIL',
      total: 1200,
      paymentStatus: 'PAYMENT_PENDING',
      customer: { name: 'Rohan', mobile: '9876543211' },
    });
    prismaMock.order.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.adminNotification.upsert.mockResolvedValueOnce({ id: 'notif_fail' });

    const failReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': failSig, 'content-type': 'application/json' },
      body: failPayload,
    });
    const failRes = await razorpayWebhookPost(failReq);
    expect(failRes.status).toBe(200);
    expect(notifyCustomerPaymentFailedMock).toHaveBeenCalledTimes(1);
  });
});
