/* cSpell:disable */
/**
 * Bangalore Delivery Location Validator
 * Enforces Bangalore-only restriction for Cash On Delivery (50% Advance + 50% on Doorstep Delivery).
 */

// Recognized Bangalore rural & peripheral technology park delivery postal codes
const BANGALORE_RURAL_PINCODES = new Set([
  '562106', // Anekal
  '562107', // Attibele
  '562114', // Bidadi
  '562120', // Harohalli
  '562122', // Nelamangala
  '562123', // Hoskote
  '562125', // Jigani
  '562129', // Magadi
  '562130', // Rajankunte
  '562135', // Chandapura
  '562143', // Sarjapura
  '562149', // Bannerghatta
  '562157', // Devanahalli
  '562162', // Doddaballapura
]);

/**
 * Validates whether a delivery pincode / city falls strictly within Bangalore / Bengaluru delivery boundaries.
 */
export function isBangaloreDelivery(pincode: string | undefined | null, city?: string | null): boolean {
  if (!pincode) return false;
  const cleanPin = pincode.replace(/\D/g, '').trim();

  // Must be a standard 6-digit Indian PIN code
  if (cleanPin.length !== 6) return false;

  // 1. All standard Bangalore Urban / City pincodes start with '560' (560001 - 560110)
  if (cleanPin.startsWith('560')) {
    return true;
  }

  // 2. Specific Bangalore rural / peripheral delivery hubs
  if (BANGALORE_RURAL_PINCODES.has(cleanPin)) {
    return true;
  }

  // 3. Fallback: If pincode starts with 562 and city explicitly mentions Bangalore / Bengaluru
  if (cleanPin.startsWith('562') && city && /bangalore|bengaluru/i.test(city)) {
    return true;
  }

  return false;
}
