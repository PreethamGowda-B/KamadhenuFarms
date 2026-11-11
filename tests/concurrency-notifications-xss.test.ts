import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  createCashfreeOrderMock,
  sendMulticastPushMock,
  sendOwnerOrderNotificationMock,
} = vi.hoisted(() => ({
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
    },
    address: {
      create: vi.fn(),
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    customerSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    adminNotification: {
      upsert: vi.fn(),
    },
    deviceToken: {
      findMany: vi.fn(),
    },
    notificationDeliveryLog: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    shop: {
      findFirst: vi.fn(),
    },
    application: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  createCashfreeOrderMock: vi.fn(),
  sendMulticastPushMock: vi.fn(),
  sendOwnerOrderNotificationMock: vi.fn(),
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
vi.mock('@/lib/firebaseAdmin', () => ({
  sendMulticastPush: sendMulticastPushMock,
}));
vi.mock('@/lib/ownerNotification', () => ({
  sendOwnerOrderNotification: sendOwnerOrderNotificationMock,
}));

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';

import { POST as createOrderPost } from '@/app/api/checkout/create-order/route';
import { GET as shopDetailGet } from '@/app/api/shops/[id]/route';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderConfirmed,
} from '@/lib/notifications';
import { SALES_COOKIE_NAME, signSalesJwt } from '@/lib/salesAuth';
import { generateDocumentHtml } from '@/lib/onboarding/templates';
import { getApplicantConfirmationTemplate } from '@/lib/email';

describe('Dual-Customer Concurrency, Notification Isolation, Unassigned-Shop BOLA & Stored XSS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
  });

  it('isolates two simultaneous customer orders without mixing items, totals, COD advance math, or customers', async () => {
    prismaMock.productInventory.findMany.mockResolvedValue([
      { id: 'p1', stockStatus: 'IN_STOCK', canPreorder: false },
      { id: 'p2', stockStatus: 'IN_STOCK', canPreorder: false },
    ]);

    let custSeq = 0;
    let addrSeq = 0;
    let ordSeq = 0;

    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.create.mockImplementation(async ({ data }: any) => {
      // Simulate micro-yield to interleave concurrent transactions
      await Promise.resolve();
      custSeq += 1;
      return { id: `cust_${custSeq}_${data.mobile}`, ...data };
    });
    prismaMock.address.create.mockImplementation(async ({ data }: any) => {
      await Promise.resolve();
      addrSeq += 1;
      return { id: `addr_${addrSeq}_${data.pincode}`, ...data };
    });

    const persistedOrders: any[] = [];
    prismaMock.order.create.mockImplementation(async ({ data }: any) => {
      ordSeq += 1;
      const row = { id: `ord_${ordSeq}`, ...data };
      persistedOrders.push(row);
      return row;
    });
    prismaMock.customerSession.create.mockResolvedValue({ id: 'sess_1' });
    createCashfreeOrderMock.mockImplementation(async (opts: any) => ({
      order_id: opts.orderId,
      payment_session_id: `cf_sess_${opts.orderId}`,
    }));

    // Customer A (Mumbai, Online, p1 500g x2 -> subtotal 798 + 130 interstate shipping = 928? Wait: gross = 1.3kg -> extraHalfKg=ceil(0.8/0.5)=2 -> rest of India 125 + 2*45 = 215 => total 1013)
    const reqA = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
      body: JSON.stringify({
        name: 'Customer Alpha',
        mobile: '9876500001',
        email: 'alpha@example.com',
        addressLine1: '10 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        items: [{ productId: 'p1', weightVariant: '500g', quantity: 2 }],
        paymentMethod: 'cashfree',
      }),
    });

    // Customer B (Bangalore COD, odd total test: p2 1kg x1 = 999 -> subtotal >= 999 -> Karnataka free shipping = 0 -> finalTotal 999 -> 50% COD advance = ceil(499.5)=500, remaining = 499)
    const reqB = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.11' },
      body: JSON.stringify({
        name: 'Customer Beta',
        mobile: '9876500002',
        email: 'beta@example.com',
        addressLine1: '22 Jayanagar 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560011',
        items: [{ productId: 'p2', weightVariant: '1kg', quantity: 1 }],
        paymentMethod: 'cod',
      }),
    });

    const [resA, resB] = await Promise.all([createOrderPost(reqA), createOrderPost(reqB)]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const bodyA = await resA.json();
    const bodyB = await resB.json();

    expect(bodyA.orderNumber).not.toBe(bodyB.orderNumber);
    expect(bodyA.orderId).not.toBe(bodyB.orderId);
    expect(bodyA.subtotal).toBe(798);
    expect(bodyA.shippingFee).toBe(215);
    expect(bodyA.finalTotal).toBe(1013);
    expect(bodyA.advanceAmount).toBe(1013);
    expect(bodyA.codRemainingAmount).toBe(0);

    // Odd-rupee COD split: ceil(999 * 0.5) = 500, remaining = 499
    expect(bodyB.subtotal).toBe(999);
    expect(bodyB.shippingFee).toBe(0);
    expect(bodyB.finalTotal).toBe(999);
    expect(bodyB.advanceAmount).toBe(500);
    expect(bodyB.codRemainingAmount).toBe(499);

    const dbA = persistedOrders.find((o) => o.orderNumber === bodyA.orderNumber);
    const dbB = persistedOrders.find((o) => o.orderNumber === bodyB.orderNumber);
    expect(dbA.customerId).toContain('9876500001');
    expect(dbB.customerId).toContain('9876500002');
    expect(dbA.items.create[0].productId).toBe('p1');
    expect(dbB.items.create[0].productId).toBe('p2');
    expect(dbA.customerId).not.toBe(dbB.customerId);
  });

  it('delivers admin and customer notifications strictly to scoped recipients and enforces delivery log idempotency', async () => {
    prismaMock.adminNotification.upsert.mockResolvedValue({ id: 'notif_1' });
    prismaMock.deviceToken.findMany.mockResolvedValueOnce([
      { token: 'admin_tok_1_aaaaaaaaaaaaaaaaaa' },
    ]);
    sendMulticastPushMock.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      invalidTokens: [],
    });
    sendOwnerOrderNotificationMock.mockResolvedValue(undefined);

    await notifyAdminNewOrder({
      id: 'ord_1',
      orderNumber: 'KHF-ORD-261111-AABBCCDD',
      customerId: 'cust_A',
      total: 999,
      paymentMethod: 'COD',
      customer: { name: 'Customer Alpha', mobile: '9876500001' },
      shippingAddress: { city: 'Bengaluru', pincode: '560011' },
      items: [{ productNameSnapshot: 'Dry Fruits Honey', weightVariant: '1kg', quantity: 1 }],
    });

    expect(prismaMock.deviceToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isAdmin: true, isActive: true },
      })
    );
    expect(sendMulticastPushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['admin_tok_1_aaaaaaaaaaaaaaaaaa'],
      })
    );

    vi.clearAllMocks();
    // Customer A notification queries ONLY customerId = 'cust_A'
    prismaMock.notificationDeliveryLog.findUnique.mockResolvedValueOnce(null);
    prismaMock.deviceToken.findMany.mockResolvedValueOnce([
      { token: 'custA_tok_1_bbbbbbbbbbbbbbbbbb' },
    ]);
    sendMulticastPushMock.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      invalidTokens: [],
    });
    prismaMock.notificationDeliveryLog.upsert.mockResolvedValue({ id: 'log_1' });

    await notifyCustomerOrderConfirmed({
      id: 'ord_1',
      orderNumber: 'KHF-ORD-261111-AABBCCDD',
      customerId: 'cust_A',
      total: 999,
    });

    expect(prismaMock.deviceToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'cust_A', isActive: true },
      })
    );
    expect(sendMulticastPushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['custA_tok_1_bbbbbbbbbbbbbbbbbb'],
      })
    );

    // Duplicate trigger is skipped idempotently when already SENT
    vi.clearAllMocks();
    prismaMock.notificationDeliveryLog.findUnique.mockResolvedValueOnce({ status: 'SENT' });
    await notifyCustomerOrderConfirmed({
      id: 'ord_1',
      orderNumber: 'KHF-ORD-261111-AABBCCDD',
      customerId: 'cust_A',
      total: 999,
    });
    expect(sendMulticastPushMock).not.toHaveBeenCalled();
  });

  it('denies sales executive GET access to unassigned (salespersonId=null) shops', async () => {
    prismaMock.application.findUnique.mockResolvedValue({
      id: 'sales_1',
      applicationNo: 'KHF-2026-001',
      fullName: 'Field Exec',
      mobileNumber: '9876543210',
      role: 'SALES_EXECUTIVE',
      status: 'HIRED',
      isAuthActive: true,
    });
    prismaMock.shop.findFirst.mockResolvedValue({
      id: 'shop_unassigned',
      shopCode: 'KHF-SHOP-000099',
      salespersonId: null,
    });

    const salesToken = signSalesJwt({
      id: 'sales_1',
      applicationNo: 'KHF-2026-001',
      fullName: 'Field Exec',
      mobileNumber: '9876543210',
      role: 'SALES_EXECUTIVE',
    });

    const req = new NextRequest('https://www.kamadhenuhoneyfarms.in/api/shops/shop_unassigned', {
      method: 'GET',
      headers: {
        cookie: `${SALES_COOKIE_NAME}=${salesToken}`,
      },
    });

    const res = await shopDetailGet(req, { params: Promise.resolve({ id: 'shop_unassigned' }) });
    expect(res.status).toBe(403);
  });

  it('escapes HTML payloads in onboarding document templates and recruitment confirmation emails to prevent Stored XSS', () => {
    const html = generateDocumentHtml('OFFER_LETTER', {
      applicationId: 'app_1',
      applicationNo: 'KHF-2026-999',
      fullName: '<img src=x onerror=alert(1)>',
      mobileNumber: '9876543210',
      email: 'xss@example.com',
      address: 'Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
      joiningDate: '2026-11-12',
      workingTerritory: '<script>alert(2)</script>',
      commissionRate: '₹100/kg',
      commissionMin: 100,
      commissionMax: 150,
      payoutFrequency: 'Weekly',
      reportingManager: 'Manager',
      engagementType: 'Sales Executive',
      additionalTerms: '<svg onload=alert(3)>',
      validFrom: '2026-11-12',
      validUntil: '2027-05-11',
      documentNo: 'DOC-1',
      issueDate: '2026-11-11',
      version: 1,
    });

    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).not.toContain('<svg onload=alert(3)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');

    const emailHtml = getApplicantConfirmationTemplate('<b onmouseover=alert(1)>Bob</b>', 'KHF"<script>');
    expect(emailHtml).not.toContain('<script>');
    expect(emailHtml).toContain('&lt;b onmouseover=alert(1)&gt;Bob&lt;/b&gt;');
  });
});
