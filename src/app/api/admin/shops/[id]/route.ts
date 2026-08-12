import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const shop = await (prisma as any).shop.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
        },
        followUps: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: shop,
    });
  } catch (error: any) {
    console.error('GET /api/admin/shops/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch shop details' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const {
      status,
      reorderIntervalDays,
      assignedSalesExecutiveId,
      assignedSalesExecutiveName,
      shopName,
      contactPerson,
      contactNumber,
      email,
      address,
      area,
      city,
      pinCode,
      notes,
      snoozeDays,
    } = body;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const currentShop = await (prisma as any).shop.findUnique({ where: { id } });
    if (!currentShop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (reorderIntervalDays) updateData.reorderIntervalDays = parseInt(reorderIntervalDays, 10);
    if (assignedSalesExecutiveId !== undefined) updateData.assignedSalesExecutiveId = assignedSalesExecutiveId || null;
    if (assignedSalesExecutiveName !== undefined) updateData.assignedSalesExecutiveName = assignedSalesExecutiveName || null;
    if (shopName) updateData.shopName = shopName.trim();
    if (contactPerson) updateData.contactPerson = contactPerson.trim();
    if (contactNumber) updateData.contactNumber = contactNumber.trim();
    if (email !== undefined) updateData.email = (email || '').trim() || null;
    if (address) updateData.address = address.trim();
    if (area) updateData.area = area.trim();
    if (city) updateData.city = city.trim();
    if (pinCode !== undefined) updateData.pinCode = (pinCode || '').trim();
    if (notes !== undefined) updateData.notes = (notes || '').trim() || null;

    // Handle Snooze Follow-up Date
    if (snoozeDays) {
      const days = parseInt(snoozeDays, 10);
      const currentFollowUp = currentShop.nextFollowUpDate ? new Date(currentShop.nextFollowUpDate) : new Date();
      updateData.nextFollowUpDate = new Date(currentFollowUp.getTime() + days * 86400000);
      updateData.status = 'ACTIVE';
    }

    const updatedShop = await (prisma as any).shop.update({
      where: { id },
      data: updateData,
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10 },
        followUps: { orderBy: { date: 'desc' }, take: 10 },
      },
    });

    await logAdminAction('admin@kamadhenuhoneyfarms.in', 'SHOP_UPDATED', id, `Updated shop ${updatedShop.shopNo} (${updatedShop.shopName})`);

    return NextResponse.json({
      success: true,
      message: 'Shop updated successfully',
      data: updatedShop,
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/shops/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update shop' }, { status: 500 });
  }
}
