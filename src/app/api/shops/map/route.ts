import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';

export const dynamic = 'force-dynamic';

// Karnataka City Coordinates Map for smart geocoding fallback
const CITY_COORDS: Record<string, [number, number]> = {
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  mysore: [12.2958, 76.6394],
  mysuru: [12.2958, 76.6394],
  mangalore: [12.9141, 74.8560],
  mangaluru: [12.9141, 74.8560],
  hubli: [15.3647, 75.1240],
  hubballi: [15.3647, 75.1240],
  dharwad: [15.4589, 75.0078],
  belgaum: [15.8497, 74.4977],
  belagavi: [15.8497, 74.4977],
  bidar: [17.9104, 77.5199],
  shimoga: [13.9299, 75.5681],
  shivamogga: [13.9299, 75.5681],
  tumkur: [13.3379, 77.1006],
  tumakuru: [13.3379, 77.1006],
  davangere: [14.4644, 75.9218],
  bellary: [15.1394, 76.9214],
  ballari: [15.1394, 76.9214],
  gulbarga: [17.3297, 76.8343],
  kalaburagi: [17.3297, 76.8343],
  udupi: [13.3409, 74.7421],
  hassan: [13.0033, 76.1004],
  mandya: [12.5242, 76.8958],
  kolar: [13.1367, 78.1340],
  chikkamagaluru: [13.3161, 75.7720],
  chikmagalur: [13.3161, 75.7720],
  chitradurga: [14.2251, 76.3980],
  bijapur: [16.8302, 75.7100],
  vijayapura: [16.8302, 75.7100],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salespersonId = searchParams.get('salespersonId') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const city = searchParams.get('city') || 'ALL';

    const where: any = {};
    if (salespersonId !== 'ALL') {
      where.salespersonId = salespersonId;
    }
    if (status !== 'ALL') {
      where.status = status;
    }
    if (city !== 'ALL') {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const shops = await prisma.shop.findMany({
      where,
      select: {
        id: true,
        shopCode: true,
        shopName: true,
        ownerName: true,
        mobile: true,
        whatsapp: true,
        address: true,
        area: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        latitude: true,
        longitude: true,
        shopType: true,
        status: true,
        responseStatus: true,
        potential: true,
        totalOrders: true,
        totalKgPurchased: true,
        totalPurchaseValue: true,
        outstandingAmount: true,
        lastOrderDate: true,
        nextReorderDate: true,
        salespersonId: true,
        salespersonSnapshotName: true,
        salesperson: {
          select: { id: true, applicationNo: true, fullName: true, mobileNumber: true },
        },
      },
    });

    const now = new Date();

    // Map each shop to coordinates with jitter for co-located shops in the same city/area
    const mapShops = shops.map((shop, idx) => {
      let lat = shop.latitude;
      let lng = shop.longitude;

      if (!lat || !lng) {
        const cityKey = (shop.city || '').toLowerCase().trim();
        const baseCoords = CITY_COORDS[cityKey] || [12.9716, 77.5946];
        // Add deterministic micro-offset based on hash of shopCode/ID so markers in same city don't stack directly
        const hash = shop.shopCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const latOffset = (((hash * 17 + idx * 23) % 100) - 50) * 0.0006;
        const lngOffset = (((hash * 31 + idx * 47) % 100) - 50) * 0.0006;
        lat = baseCoords[0] + latOffset;
        lng = baseCoords[1] + lngOffset;
      }

      // Determine reorder status tag
      let reorderStatus: 'REORDERED' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'NO_ORDERS' = 'NO_ORDERS';
      if (shop.nextReorderDate) {
        const nextDate = new Date(shop.nextReorderDate);
        const diffMs = nextDate.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 0) {
          reorderStatus = 'OVERDUE';
        } else if (diffDays <= 1) {
          reorderStatus = 'DUE_TODAY';
        } else if (diffDays <= 3) {
          reorderStatus = 'DUE_SOON';
        } else {
          reorderStatus = 'REORDERED';
        }
      }

      return {
        ...shop,
        latitude: lat,
        longitude: lng,
        reorderStatus,
        salespersonName: shop.salesperson?.fullName || shop.salespersonSnapshotName || 'Unassigned',
      };
    });

    return NextResponse.json({ success: true, count: mapShops.length, shops: mapShops });
  } catch (error: any) {
    console.error('Map fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch map data' }, { status: 500 });
  }
}
