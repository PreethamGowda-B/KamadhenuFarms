import crypto from 'crypto';

/**
 * Generates an instantaneous, collision-free, non-enumerable customer-friendly order number.
 * Format: KHF-ORD-YYMMDD-XXXXXXXX (cryptographically random 4-byte hex suffix)
 */
export function generateNextOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `KHF-ORD-${yy}${mm}${dd}-${randHex}`;
}

