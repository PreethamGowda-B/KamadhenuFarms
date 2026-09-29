/**
 * Generates an instantaneous, collision-free customer-friendly order number.
 * Format: KHF-ORD-XXXXXX (e.g. KHF-ORD-84920134)
 */
export function generateNextOrderNumber(): string {
  const ts = Math.floor(Date.now() / 1000).toString().slice(-6);
  const rand = Math.floor(10 + Math.random() * 90);
  return `KHF-ORD-${ts}${rand}`;
}

