import crypto from 'crypto';

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface CashfreeOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customer: CashfreeCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  entity: string;
  order_currency: string;
  order_amount: number;
  order_status: string; // 'ACTIVE', 'PAID', 'EXPIRED'
  payment_session_id: string;
  order_expiry_time?: string;
  message?: string;
  code?: string;
  type?: string;
}

export interface CashfreePaymentEntity {
  cf_payment_id: number | string;
  order_id: string;
  entity: string;
  payment_currency: string;
  payment_amount: number;
  payment_time: string;
  payment_completion_time?: string;
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'USER_DROPPED';
  payment_message?: string;
  payment_method?: any;
  bank_reference?: string;
  auth_id?: string;
}

export function getCashfreeConfig() {
  const clientId = (
    process.env.CASHFREE_CLIENT_ID ||
    process.env.CASHFREE_APP_ID ||
    ''
  ).trim();

  const clientSecret = (
    process.env.CASHFREE_CLIENT_SECRET ||
    process.env.CASHFREE_SECRET_KEY ||
    ''
  ).trim();

  const env = (process.env.CASHFREE_ENV || 'production').trim().toLowerCase();
  const isProduction = env === 'production' || env === 'prod';
  const baseUrl = isProduction
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  const apiVersion = '2023-08-01';

  return {
    clientId,
    clientSecret,
    env: isProduction ? 'production' : 'sandbox',
    baseUrl,
    apiVersion,
  };
}

/**
 * Common headers for Cashfree API requests
 */
function getCashfreeHeaders() {
  const { clientId, clientSecret, apiVersion } = getCashfreeConfig();

  if (!clientId || !clientSecret) {
    throw new Error('Cashfree credentials (CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET) are not configured in environment variables');
  }

  return {
    'Content-Type': 'application/json',
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'x-api-version': apiVersion,
    'Accept': 'application/json',
  };
}

/**
 * Creates an order on Cashfree PG and retrieves payment_session_id
 */
export async function createCashfreeOrder(params: CashfreeOrderParams): Promise<CashfreeOrderResponse> {
  const { baseUrl } = getCashfreeConfig();
  const headers = getCashfreeHeaders();

  const sanitizedOrderId = params.orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45);
  const sanitizedCustomerId = (params.customer.customer_id || `customer_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 45);

  const cleanPhone = params.customer.customer_phone.replace(/\D/g, '').slice(-10);

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://kamadhenuhoneyfarms.in'
  ).replace(/\/$/, '');

  const returnUrl = params.returnUrl || `${appBaseUrl}/order-confirmation?order_id={order_id}`;
  const notifyUrl = params.notifyUrl || `${appBaseUrl}/api/payment/cashfree/webhook`;

  const payload = {
    order_id: sanitizedOrderId,
    order_amount: Math.round(params.orderAmount * 100) / 100,
    order_currency: params.orderCurrency || 'INR',
    customer_details: {
      customer_id: sanitizedCustomerId,
      customer_name: params.customer.customer_name.trim().slice(0, 100),
      customer_email: params.customer.customer_email.trim().toLowerCase().slice(0, 100),
      customer_phone: cleanPhone,
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl,
    },
    order_note: (params.orderNote || 'Kamadhenu Honey Farms Pure Honey Order').slice(0, 200),
  };

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Cashfree Order API returned status ${response.status}`;
    console.error('❌ [Cashfree createOrder Error]', response.status, data);
    throw new Error(errorMsg);
  }

  return data as CashfreeOrderResponse;
}

/**
 * Fetches order details directly from Cashfree
 */
export async function getCashfreeOrder(orderId: string): Promise<CashfreeOrderResponse> {
  const { baseUrl } = getCashfreeConfig();
  const headers = getCashfreeHeaders();

  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45);

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(sanitizedOrderId)}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Cashfree getOrder API returned status ${response.status}`;
    console.error('❌ [Cashfree getOrder Error]', response.status, data);
    throw new Error(errorMsg);
  }

  return data as CashfreeOrderResponse;
}

/**
 * Fetches all payment attempts and their statuses for a Cashfree order
 */
export async function getCashfreeOrderPayments(orderId: string): Promise<CashfreePaymentEntity[]> {
  const { baseUrl } = getCashfreeConfig();
  const headers = getCashfreeHeaders();

  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 45);

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(sanitizedOrderId)}/payments`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.message || data.error || `Cashfree getOrderPayments API returned status ${response.status}`;
    console.error('❌ [Cashfree getOrderPayments Error]', response.status, data);
    throw new Error(errorMsg);
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Cryptographically verifies Cashfree Webhook Signature
 * Formula: HMAC-SHA256(timestamp + rawBody, clientSecret)
 * Compared against x-webhook-signature (supports Base64 & Hex)
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const { clientSecret } = getCashfreeConfig();

  if (!clientSecret || !signature || !timestamp) {
    return false;
  }

  const payload = `${timestamp}${rawBody}`;

  // Cashfree PG v3 documentation specifies Base64 digest
  const expectedBase64 = crypto
    .createHmac('sha256', clientSecret)
    .update(payload)
    .digest('base64');

  // Some implementations or versions can also send Hex digest
  const expectedHex = crypto
    .createHmac('sha256', clientSecret)
    .update(payload)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');

    // Compare with Base64
    const b64Buf = Buffer.from(expectedBase64, 'utf8');
    if (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf)) {
      return true;
    }

    // Compare with Hex
    const hexBuf = Buffer.from(expectedHex, 'utf8');
    if (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) {
      return true;
    }
  } catch (err) {
    console.error('Error in Cashfree webhook signature comparison:', err);
    return false;
  }

  return false;
}
