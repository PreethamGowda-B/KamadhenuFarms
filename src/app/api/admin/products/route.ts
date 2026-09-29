import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { PRODUCTS } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const dbItems = await prisma.productInventory.findMany({
      orderBy: { id: 'asc' },
    });

    const dbMap = new Map(dbItems.map((item) => [item.id, item]));

    // Combine static product details with live database inventory records
    const productList = Object.keys(PRODUCTS).map((id) => {
      const p = PRODUCTS[id];
      const dbRecord = dbMap.get(id);

      return {
        id,
        name: p.name,
        subtitle: p.subtitle || '',
        category: p.category,
        baseDesc: p.baseDesc,
        prices: p.prices,
        image: p.image,
        images: p.images,
        stockStatus: dbRecord?.stockStatus || 'IN_STOCK',
        restockDays: dbRecord?.restockDays ?? 3,
        restockNote: dbRecord?.restockNote || 'Stock will be restocked within 3 days',
        badgeText: dbRecord?.badgeText || (p.category === 'raw' ? 'Organic' : 'Deluxe'),
        canPreorder: dbRecord?.canPreorder ?? false,
        updatedAt: dbRecord?.updatedAt || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      products: productList,
    });
  } catch (error: any) {
    console.error('Admin products GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admin products', error: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Support single product update or batch update
    const itemsToUpdate: Array<{
      id: string;
      stockStatus: string;
      restockDays?: number;
      restockNote?: string;
      badgeText?: string;
      canPreorder?: boolean;
    }> = Array.isArray(body.products) ? body.products : [body];

    if (!itemsToUpdate.length || !itemsToUpdate[0]?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: product id is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const item of itemsToUpdate) {
      const validStatuses = ['IN_STOCK', 'OUT_OF_STOCK', 'RESTOCKING_SOON'];
      const stockStatus = validStatuses.includes(item.stockStatus) ? item.stockStatus : 'IN_STOCK';
      const restockDays = Number(item.restockDays) || 3;
      const restockNote = (item.restockNote || `Stock will be restocked within ${restockDays} days`).trim();
      const badgeText = (item.badgeText || (stockStatus === 'RESTOCKING_SOON' ? `Restocking in ${restockDays} days` : 'In Stock')).trim();
      const canPreorder = Boolean(item.canPreorder);

      const productName = PRODUCTS[item.id]?.name || item.id;

      const record = await prisma.productInventory.upsert({
        where: { id: item.id },
        update: {
          name: productName,
          stockStatus,
          restockDays,
          restockNote,
          badgeText,
          canPreorder,
        },
        create: {
          id: item.id,
          name: productName,
          stockStatus,
          restockDays,
          restockNote,
          badgeText,
          canPreorder,
        },
      });

      results.push(record);
    }

    return NextResponse.json({
      success: true,
      message: 'Product stock status updated in real-time',
      updated: results,
    });
  } catch (error: any) {
    console.error('Admin products POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product stock', error: error?.message },
      { status: 500 }
    );
  }
}
