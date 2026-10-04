/* cSpell:disable */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRODUCTS } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    let dbInventory: any[] = [];
    try {
      dbInventory = await prisma.productInventory.findMany({
        orderBy: { id: 'asc' },
      });
    } catch (dbErr) {
      console.warn('Could not query ProductInventory table directly, falling back:', dbErr);
    }

    // Map into keyed lookup
    const inventoryMap: Record<string, any> = {};

    // Populate defaults from PRODUCTS config
    Object.keys(PRODUCTS).forEach((id) => {
      const p = PRODUCTS[id];
      inventoryMap[id] = {
        id,
        name: p.name,
        stockStatus: 'IN_STOCK',
        restockDays: 3,
        restockNote: 'Stock will be restocked within 3 days',
        badgeText: p.category === 'raw' ? 'Organic' : (p.category === 'honeycomb' ? (p.id === 'p3' ? 'Most Innovative' : 'Pure Comb') : 'Deluxe'),
        canPreorder: false,
        prices: p.prices,
        image: p.image,
      };
    });

    // Merge database state
    dbInventory.forEach((item) => {
      if (inventoryMap[item.id]) {
        inventoryMap[item.id] = {
          ...inventoryMap[item.id],
          stockStatus: item.stockStatus,
          restockDays: item.restockDays,
          restockNote: item.restockNote || 'Stock will be restocked within 3 days',
          badgeText: item.badgeText || (item.stockStatus === 'RESTOCKING_SOON' ? `Restocking in ${item.restockDays} days` : inventoryMap[item.id].badgeText),
          canPreorder: item.canPreorder,
          updatedAt: item.updatedAt,
        };
      }
    });

    return NextResponse.json(
      {
        success: true,
        inventory: inventoryMap,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching product inventory:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product inventory', error: error?.message },
      { status: 500 }
    );
  }
}
