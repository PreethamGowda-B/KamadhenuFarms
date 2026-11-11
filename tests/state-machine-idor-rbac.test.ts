import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    shipment: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    shop: {
      findUnique: vi.fn(),
    },
    shopOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    customerSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/notifications', () => ({
  notifyCustomerOrderProcessing: vi.fn(async () => {}),
  notifyCustomerOrderPacked: vi.fn(async () => {}),
  notifyCustomerOrderDelivered: vi.fn(async () => {}),
  notifyCustomerOrderShipped: vi.fn(async () => {}),
}));

process.env.JWT_SECRET = 'test-jwt-secret-key-for-kamadhenu-unit-tests-2026';

import { ADMIN_COOKIE_NAME, signJwt } from '@/lib/auth';
import { SALES_COOKIE_NAME, signSalesJwt } from '@/lib/salesAuth';
import {
  ORDER_ACCESS_COOKIE_NAME,
  signOrderAccessToken,
} from '@/lib/customerAuth';
import {
  canTransitionOrderStatus,
  isOrderPaymentConfirmed,
  requiresConfirmedPaymentForOrderStatus,
  sanitizeTrackingUrl,
} from '@/lib/orderStateMachine';
import { PATCH as adminOrderPatch } from '@/app/api/admin/orders/[id]/route';
import { POST as adminShipmentPost } from '@/app/api/admin/orders/[id]/shipment/route';
import { GET as invoiceGet } from '@/app/api/orders/invoice/route';
import { GET as trackGet } from '@/app/api/orders/track/route';
import { GET as adminAppsGet } from '@/app/api/admin/applications/route';
import { POST as adminFollowupPost } from '@/app/api/admin/shops/[id]/followups/route';
import { POST as salesLoginPost } from '@/app/api/sales/login/route';
import { POST as shopOrdersPost } from '@/app/api/shops/[id]/orders/route';
import { POST as uploadPost } from '@/app/api/upload/route';

describe('Order State Machine, IDOR Guards, Admin RBAC & Upload Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(prismaMock);
      return Promise.all(arg);
    });
  });

  it('enforces valid order lifecycle transitions, payment gate & tracking URL sanitization', () => {
    expect(canTransitionOrderStatus('NEW', 'CONFIRMED').allowed).toBe(true);
    expect(canTransitionOrderStatus('SHIPPED', 'DELIVERED').allowed).toBe(true);
    expect(canTransitionOrderStatus('NEW', 'DELIVERED').allowed).toBe(false);
    expect(canTransitionOrderStatus('CANCELLED', 'CONFIRMED').allowed).toBe(false);
    expect(canTransitionOrderStatus('DELIVERED', 'PROCESSING').allowed).toBe(false);

    expect(requiresConfirmedPaymentForOrderStatus('SHIPPED')).toBe(true);
    expect(isOrderPaymentConfirmed('PAYMENT_PENDING')).toBe(false);
    expect(isOrderPaymentConfirmed('PAID')).toBe(true);
    expect(isOrderPaymentConfirmed('COD_ADVANCE_PAID')).toBe(true);

    expect(sanitizeTrackingUrl('https://shiprocket.co/track/12345')).toBe(
      'https://shiprocket.co/track/12345'
    );
    expect(sanitizeTrackingUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(sanitizeTrackingUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('blocks admin order status regression, unpaid dispatch, and duplicate COD cash collection', async () => {
    const adminToken = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, 3600);

    // 1. Invalid DELIVERED -> PROCESSING transition rejected
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_1',
      orderNumber: 'KHF-ORD-100',
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      codRemainingAmount: 0,
    });
    const invalidRes = await adminOrderPatch(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/orders/ord_1', {
        method: 'PATCH',
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: 'PROCESSING' }),
      }),
      { params: { id: 'ord_1' } }
    );
    expect(invalidRes.status).toBe(400);

    // 2. Duplicate COD balance collection rejected
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_2',
      orderNumber: 'KHF-ORD-101',
      orderStatus: 'SHIPPED',
      paymentStatus: 'FULLY_PAID',
      codRemainingAmount: 400,
    });
    const dupCodRes = await adminOrderPatch(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/orders/ord_2', {
        method: 'PATCH',
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'COLLECT_COD_BALANCE', markDelivered: true }),
      }),
      { params: { id: 'ord_2' } }
    );
    expect(dupCodRes.status).toBe(400);

    // 3. Shipment creation blocked for unpaid orders and javascript: trackingUrl
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'ord_3',
      orderNumber: 'KHF-ORD-102',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAYMENT_PENDING',
      shippingFee: 0,
    });
    const unpaidShipRes = await adminShipmentPost(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/orders/ord_3/shipment', {
        method: 'POST',
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          courierProvider: 'Delhivery',
          trackingNumber: 'AWB123456',
          trackingUrl: 'https://delhivery.com/track/AWB123456',
        }),
      }),
      { params: { id: 'ord_3' } }
    );
    expect(unpaidShipRes.status).toBe(400);

    const xssTrackRes = await adminShipmentPost(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/orders/ord_3/shipment', {
        method: 'POST',
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          courierProvider: 'Delhivery',
          trackingNumber: 'AWB123456',
          trackingUrl: 'javascript:alert(1)',
        }),
      }),
      { params: { id: 'ord_3' } }
    );
    expect(xssTrackRes.status).toBe(400);
  });

  it('prevents IDOR on /api/orders/invoice (blocks 2h grace & ?mobile= bypass) and requires proof on /api/orders/track', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'ord_priv_1',
      orderNumber: 'KHF-ORD-PRIV1',
      customerId: 'cust_owner_1',
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      createdAt: new Date(), // placed 1 second ago (2h window MUST NOT bypass!)
      customer: { id: 'cust_owner_1', name: 'Owner', mobile: '9876543210' },
      shippingAddress: { addressLine1: 'Secret Home Address', city: 'Bengaluru', state: 'KA', pincode: '560001' },
      items: [],
      payments: [],
      shipments: [],
    });

    // Attacker with orderNumber + mobile guess -> MUST get 403
    const attackerInvoiceReq = new NextRequest(
      'https://kamadhenuhoneyfarms.in/api/orders/invoice?orderNumber=KHF-ORD-PRIV1&mobile=9876543210'
    );
    expect((await invoiceGet(attackerInvoiceReq)).status).toBe(403);

    // Owner with signed order token -> MUST succeed 200
    const orderToken = signOrderAccessToken('KHF-ORD-PRIV1', 'cust_owner_1');
    const ownerInvoiceReq = new NextRequest(
      `https://kamadhenuhoneyfarms.in/api/orders/invoice?orderNumber=KHF-ORD-PRIV1&token=${encodeURIComponent(orderToken)}`
    );
    expect((await invoiceGet(ownerInvoiceReq)).status).toBe(200);

    // Order tracking without mobile, session, or order token -> MUST get 401
    const unauthTrackReq = new NextRequest(
      'https://kamadhenuhoneyfarms.in/api/orders/track?orderNumber=KHF-ORD-PRIV1',
      { headers: { 'x-forwarded-for': '192.0.2.50' } }
    );
    expect((await trackGet(unauthTrackReq)).status).toBe(401);
  });

  it('enforces admin RBAC on /api/admin/applications and /api/admin/shops/[id]/followups', async () => {
    const noAuthApps = await adminAppsGet(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/applications')
    );
    expect(noAuthApps.status).toBe(403);

    const noAuthFollowup = await adminFollowupPost(
      new NextRequest('https://admin.kamadhenuhoneyfarms.in/api/admin/shops/shop_1/followups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: 'Unauthorized note' }),
      }),
      { params: { id: 'shop_1' } }
    );
    expect(noAuthFollowup.status).toBe(403);
  });

  it('blocks sales substring login bypass and cross-salesperson shop order IDOR', async () => {
    // Login with partial substring query must query exact mobile OR applicationNo (>= 5 chars)
    prismaMock.application.findFirst.mockResolvedValueOnce(null);
    const substringLoginReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/sales/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.88' },
      body: JSON.stringify({ identifier: '9876543210' }),
    });
    const loginRes = await salesLoginPost(substringLoginReq);
    expect(loginRes.status).toBe(401);
    const callArgs = prismaMock.application.findFirst.mock.calls[0]?.[0];
    expect(JSON.stringify(callArgs)).not.toContain('contains');

    // Cross-salesperson shop order access -> 403
    const salesBToken = signSalesJwt({
      id: 'sales_B',
      applicationNo: 'KHF-2026-B',
      fullName: 'Sales B',
      mobileNumber: '9111111111',
      role: 'SALES_EXECUTIVE',
    });
    prismaMock.application.findUnique.mockResolvedValueOnce({
      status: 'HIRED',
      isAuthActive: true,
    });
    prismaMock.shop.findUnique.mockResolvedValueOnce({
      id: 'shop_A',
      salespersonId: 'sales_A',
    });

    const idorShopReq = new NextRequest('https://kamadhenuhoneyfarms.in/api/shops/shop_A/orders', {
      method: 'POST',
      headers: {
        cookie: `${SALES_COOKIE_NAME}=${salesBToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ productName: 'Pure Raw Honey', quantity: 2, unitPrice: 500 }],
      }),
    });
    expect((await shopOrdersPost(idorShopReq, { params: { id: 'shop_A' } })).status).toBe(403);
  });

  it('blocks disallowed upload folders, dangerous MIME/extensions, and spoofed PDF magic bytes', async () => {
    // 1. Disallowed folder rejected (400)
    const badFolderForm = new FormData();
    badFolderForm.append('folder', '../arbitrary_bucket');
    badFolderForm.append('file', new File(['%PDF-1.4\n'], 'cv.pdf', { type: 'application/pdf' }));
    const badFolderRes = await uploadPost(
      new NextRequest('https://kamadhenuhoneyfarms.in/api/upload', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.101' },
        body: badFolderForm,
      })
    );
    expect(badFolderRes.status).toBe(400);

    // 2. Spoofed HTML payload renamed to .pdf with application/pdf Content-Type rejected (415)
    const spoofForm = new FormData();
    spoofForm.append('folder', 'kamadhenu_resumes');
    spoofForm.append(
      'file',
      new File(['<html><script>alert(1)</script></html>'], 'malicious.pdf', {
        type: 'application/pdf',
      })
    );
    const spoofRes = await uploadPost(
      new NextRequest('https://kamadhenuhoneyfarms.in/api/upload', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.102' },
        body: spoofForm,
      })
    );
    expect(spoofRes.status).toBe(400);
    expect((await spoofRes.json()).message).toMatch(/does not match/i);

    // 3. Unauthenticated upload into internal kamadhenu_products rejected (401)
    const unauthImgForm = new FormData();
    unauthImgForm.append('folder', 'kamadhenu_products');
    unauthImgForm.append(
      'file',
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])], 'jar.png', {
        type: 'image/png',
      })
    );
    const unauthImgRes = await uploadPost(
      new NextRequest('https://kamadhenuhoneyfarms.in/api/upload', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.103' },
        body: unauthImgForm,
      })
    );
    expect(unauthImgRes.status).toBe(401);
  });
});
