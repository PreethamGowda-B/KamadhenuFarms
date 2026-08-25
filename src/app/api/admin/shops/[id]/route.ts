import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const shop = await prisma.shop.findFirst({
      where: {
        OR: [{ id }, { shopCode: id }, { shopNo: id }],
      },
      include: {
        requirements: true,
        orders: {
          orderBy: { orderDate: 'desc' },
          include: {
            items: true,
            payments: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        visits: {
          orderBy: { visitDate: 'desc' },
        },
        reminders: {
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        salesperson: {
          select: {
            id: true,
            applicationNo: true,
            fullName: true,
            mobileNumber: true,
            workingTerritory: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: shop,
      shop,
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

    const currentShop = await prisma.shop.findFirst({
      where: { OR: [{ id }, { shopCode: id }] },
    });
    if (!currentShop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.shopName) updateData.shopName = body.shopName.trim();
    if (body.ownerName || body.contactPerson) {
      const name = (body.ownerName || body.contactPerson).trim();
      updateData.ownerName = name;
      updateData.contactPerson = name;
    }
    if (body.mobile || body.contactNumber) {
      const mob = (body.mobile || body.contactNumber).trim();
      updateData.mobile = mob;
      updateData.contactNumber = mob;
    }
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp ? body.whatsapp.trim() : null;
    if (body.email !== undefined) updateData.email = body.email ? body.email.trim() : null;
    if (body.address) updateData.address = body.address.trim();
    if (body.area) updateData.area = body.area.trim();
    if (body.city) updateData.city = body.city.trim();
    if (body.district !== undefined) updateData.district = body.district;
    if (body.pincode || body.pinCode) {
      const pin = (body.pincode || body.pinCode).trim();
      updateData.pincode = pin;
      updateData.pinCode = pin;
    }
    if (body.status) updateData.status = body.status;
    if (body.responseStatus) updateData.responseStatus = body.responseStatus;
    if (body.potential) updateData.potential = body.potential;
    if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
    if (body.creditPeriod !== undefined) updateData.creditPeriod = body.creditPeriod;
    if (body.creditLimit !== undefined) updateData.creditLimit = parseFloat(body.creditLimit || '0');
    if (body.agreedPaymentDate !== undefined) {
      updateData.agreedPaymentDate = body.agreedPaymentDate ? new Date(body.agreedPaymentDate) : null;
    }
    if (body.estimatedMonthlyKg !== undefined) {
      updateData.estimatedMonthlyKg = parseFloat(body.estimatedMonthlyKg || '0');
    }
    if (body.reorderIntervalDays || body.estimatedReorderCycleDays) {
      const cycle = parseInt(body.reorderIntervalDays || body.estimatedReorderCycleDays || '30', 10);
      updateData.reorderIntervalDays = cycle;
      updateData.estimatedReorderCycleDays = cycle;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (body.salespersonId) {
      updateData.salespersonId = body.salespersonId;
      updateData.assignedSalesExecutiveId = body.salespersonId;
    }

    const updatedShop = await prisma.shop.update({
      where: { id: currentShop.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedShop,
      message: 'Shop updated successfully',
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/shops/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update shop' }, { status: 500 });
  }
}
