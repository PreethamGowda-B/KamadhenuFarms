import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const city = searchParams.get('city') || 'ALL';
    const area = searchParams.get('area') || 'ALL';
    const salesExecutiveId = searchParams.get('salesExecutiveId') || 'ALL';
    const followUpFilter = searchParams.get('followUpFilter') || 'ALL'; // DUE_TODAY, OVERDUE, UPCOMING, WAITING, CONFIRMED
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    let shops: any[] = [];
    let totalCount = 0;

    // Build Prisma query condition
    const where: any = {};

    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search } },
        { area: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { shopNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== 'ALL') {
      where.status = status;
    }

    if (city !== 'ALL') {
      where.city = city;
    }

    if (area !== 'ALL') {
      where.area = area;
    }

    if (salesExecutiveId !== 'ALL') {
      where.assignedSalesExecutiveId = salesExecutiveId;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (followUpFilter === 'DUE_TODAY') {
      where.nextFollowUpDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (followUpFilter === 'OVERDUE') {
      where.nextFollowUpDate = {
        lt: startOfToday,
      };
    } else if (followUpFilter === 'UPCOMING') {
      where.nextFollowUpDate = {
        gt: endOfToday,
      };
    } else if (followUpFilter === 'WAITING') {
      where.status = 'WAITING_FOR_RESPONSE';
    } else if (followUpFilter === 'CONFIRMED') {
      where.status = 'ORDER_CONFIRMED';
    }

    if (process.env.DATABASE_URL) {
      try {
        const [dbShops, count] = await Promise.all([
          (prisma as any).shop.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
            include: {
              orders: { take: 5, orderBy: { orderDate: 'desc' } },
              followUps: { take: 5, orderBy: { date: 'desc' } },
            },
          }),
          (prisma as any).shop.count({ where }),
        ]);

        shops = dbShops;
        totalCount = count;
      } catch (dbErr) {
        console.error('Prisma Shop GET error:', dbErr);
      }
    }

    // Compute Summary Dashboard KPI metrics directly from database
    let activeShops = 0;
    let followUpsDue = 0;
    let overdue = 0;
    let ordersThisMonth = 0;
    let kgSoldThisMonth = 0;
    let repeatCustomers = 0;
    let totalKgSold = 0;

    if (process.env.DATABASE_URL) {
      try {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [allShopsCount, dueCount, overdueCount, monthOrders] = await Promise.all([
          (prisma as any).shop.count({ where: { status: { in: ['ACTIVE', 'ORDER_CONFIRMED', 'FOLLOW_UP_DUE', 'WAITING_FOR_RESPONSE'] } } }),
          (prisma as any).shop.count({
            where: {
              nextFollowUpDate: { gte: startOfToday, lte: endOfToday },
            },
          }),
          (prisma as any).shop.count({
            where: {
              nextFollowUpDate: { lt: startOfToday },
            },
          }),
          (prisma as any).shopOrder.findMany({
            where: {
              orderDate: { gte: startOfMonth },
            },
          }),
        ]);

        activeShops = allShopsCount;
        followUpsDue = dueCount;
        overdue = overdueCount;
        ordersThisMonth = monthOrders.length;
        kgSoldThisMonth = monthOrders.reduce((sum: number, o: any) => sum + (o.kg || 0), 0);

        const repeatShops = await (prisma as any).shop.count({
          where: { totalOrders: { gte: 2 } },
        });
        repeatCustomers = repeatShops;

        const totalKgAggregate = await (prisma as any).shop.aggregate({
          _sum: { totalKgPurchased: true },
        });
        totalKgSold = totalKgAggregate._sum?.totalKgPurchased || 0;
      } catch (metricsErr) {
        console.error('Error computing shop metrics:', metricsErr);
      }
    }

    // Fetch Hired Sales Executives for dropdown filters
    let salesExecutives: any[] = [];
    if (process.env.DATABASE_URL) {
      try {
        salesExecutives = await (prisma as any).application.findMany({
          where: {
            status: { in: ['HIRED', 'SELECTED'] },
          },
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
            city: true,
            workingTerritory: true,
          },
        });
      } catch (execErr) {}
    }

    return NextResponse.json({
      success: true,
      data: shops,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      metrics: {
        activeShops,
        followUpsDue,
        overdue,
        ordersThisMonth,
        kgSoldThisMonth: Math.round(kgSoldThisMonth * 10) / 10,
        repeatCustomers,
        totalKgSold: Math.round(totalKgSold * 10) / 10,
      },
      salesExecutives,
    });
  } catch (error: any) {
    console.error('GET /api/admin/shops error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch shops' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      shopName,
      contactPerson,
      contactNumber,
      email,
      address,
      area,
      city,
      state,
      pinCode,
      assignedSalesExecutiveId,
      assignedSalesExecutiveName,
      reorderIntervalDays,
      notes,
    } = body;

    // Required Field Validations
    if (!shopName?.trim()) {
      return NextResponse.json({ success: false, message: 'Shop name is required' }, { status: 400 });
    }

    if (!contactPerson?.trim()) {
      return NextResponse.json({ success: false, message: 'Contact person name is required' }, { status: 400 });
    }

    const cleanPhone = (contactNumber || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ success: false, message: 'A valid 10-digit phone number is required' }, { status: 400 });
    }

    if (!address?.trim() || !city?.trim() || !area?.trim()) {
      return NextResponse.json({ success: false, message: 'Shop address, area, and city are required' }, { status: 400 });
    }

    // Duplicate Check by Contact Number + Shop Name
    if (process.env.DATABASE_URL) {
      const existing = await (prisma as any).shop.findFirst({
        where: {
          OR: [
            { contactNumber: cleanPhone },
            {
              AND: [
                { shopName: { equals: shopName.trim(), mode: 'insensitive' } },
                { area: { equals: area.trim(), mode: 'insensitive' } },
              ],
            },
          ],
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, message: `A shop with contact number ${cleanPhone} or name '${shopName}' in ${area} already exists in the database (${existing.shopNo}).` },
          { status: 409 }
        );
      }
    }

    // Sequence Shop No Generation (e.g. KHF-SHOP-001)
    let createdShop = null;
    if (process.env.DATABASE_URL) {
      const count = await (prisma as any).shop.count();
      const numStr = String(count + 1).padStart(3, '0');
      const shopNo = `KHF-SHOP-${numStr}`;

      const intervalDays = parseInt(reorderIntervalDays || '30', 10);
      const nextFollowUp = new Date(Date.now() + intervalDays * 86400000);

      createdShop = await (prisma as any).shop.create({
        data: {
          shopNo,
          shopName: shopName.trim(),
          contactPerson: contactPerson.trim(),
          contactNumber: cleanPhone,
          email: (email || '').trim() || null,
          address: address.trim(),
          area: area.trim(),
          city: city.trim(),
          state: (state || 'Karnataka').trim(),
          pinCode: (pinCode || '').trim(),
          assignedSalesExecutiveId: assignedSalesExecutiveId || null,
          assignedSalesExecutiveName: assignedSalesExecutiveName || null,
          status: 'ACTIVE',
          reorderIntervalDays: intervalDays,
          nextFollowUpDate: nextFollowUp,
          notes: (notes || '').trim() || null,
        },
      });

      // Audit Log
      await logAdminAction('admin@kamadhenuhoneyfarms.in', 'SHOP_CREATED', createdShop.id, `Created Shop: ${createdShop.shopName} (${createdShop.shopNo})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Shop created successfully',
      data: createdShop,
    });
  } catch (error: any) {
    console.error('POST /api/admin/shops error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create shop' }, { status: 500 });
  }
}
