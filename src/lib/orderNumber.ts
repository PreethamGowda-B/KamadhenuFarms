import { prisma } from './prisma';

/**
 * Generates an atomic, sequential customer-friendly order number.
 * Format: KHF-ORD-000001, KHF-ORD-000002, etc.
 */
export async function generateNextOrderNumber(): Promise<string> {
  const sequence = await prisma.ecommerceOrderSequence.upsert({
    where: { id: 1 },
    update: { lastSeq: { increment: 1 } },
    create: { id: 1, lastSeq: 1 },
  });

  const padded = String(sequence.lastSeq).padStart(6, '0');
  return `KHF-ORD-${padded}`;
}
