export type EcommerceOrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type EcommercePaymentStatus =
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'COD_ADVANCE_PENDING'
  | 'COD_ADVANCE_PAID'
  | 'COD_BALANCE_PENDING'
  | 'FULLY_PAID';

export const ALLOWED_ORDER_TRANSITIONS: Record<EcommerceOrderStatus, EcommerceOrderStatus[]> = {
  NEW: ['NEW', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['SHIPPED', 'DELIVERED', 'RETURNED'],
  DELIVERED: ['DELIVERED', 'RETURNED'],
  CANCELLED: ['CANCELLED'],
  RETURNED: ['RETURNED'],
};

const PAID_PAYMENT_STATUSES = new Set<string>([
  'PAID',
  'COD_ADVANCE_PAID',
  'COD_BALANCE_PENDING',
  'FULLY_PAID',
]);

export function isOrderPaymentConfirmed(paymentStatus: string | null | undefined): boolean {
  return Boolean(paymentStatus && PAID_PAYMENT_STATUSES.has(paymentStatus));
}

export function canTransitionOrderStatus(
  fromStatus: string,
  toStatus: string
): { allowed: boolean; reason?: string } {
  const from = fromStatus as EcommerceOrderStatus;
  const to = toStatus as EcommerceOrderStatus;

  const allowedTargets = ALLOWED_ORDER_TRANSITIONS[from];
  if (!allowedTargets) {
    return { allowed: false, reason: `Unknown current order status: ${fromStatus}` };
  }

  if (!allowedTargets.includes(to)) {
    return {
      allowed: false,
      reason: `Invalid order status transition from ${from} to ${to}.`,
    };
  }

  return { allowed: true };
}

export function requiresConfirmedPaymentForOrderStatus(status: string): boolean {
  return ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status);
}

export function sanitizeTrackingUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
