import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

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

    // Role check: sales executive can only view their own shops
    if (salesSession && !adminSession && shop.salespersonId && shop.salespersonId !== salesSession.id) {
      return NextResponse.json({ success: false, message: 'Access denied to this shop' }, { status: 403 });
    }

    // Calculate dynamic reorder status
    const now = new Date();
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

    return NextResponse.json({
      success: true,
      shop,
      reorderStatus,
    });
  } catch (error: any) {
    console.error('Shop details error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    if (salesSession && !adminSession && shop.salespersonId !== salesSession.id) {
      return NextResponse.json({ success: false, message: 'Permission denied' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.shopName !== undefined) updateData.shopName = body.shopName;
    if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
    if (body.mobile !== undefined) updateData.mobile = body.mobile;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.area !== undefined) updateData.area = body.area;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.pincode !== undefined) updateData.pincode = body.pincode;
    if (body.mapsUrl !== undefined) updateData.mapsUrl = body.mapsUrl;
    if (body.latitude !== undefined) updateData.latitude = body.latitude ? parseFloat(body.latitude) : null;
    if (body.longitude !== undefined) updateData.longitude = body.longitude ? parseFloat(body.longitude) : null;
    if (body.shopType !== undefined) updateData.shopType = body.shopType;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.responseStatus !== undefined) updateData.responseStatus = body.responseStatus;
    if (body.potential !== undefined) updateData.potential = body.potential;
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.creditPeriod !== undefined) updateData.creditPeriod = body.creditPeriod;
    if (body.creditLimit !== undefined) updateData.creditLimit = parseFloat(body.creditLimit || '0');
    if (body.agreedPaymentDate !== undefined) {
      updateData.agreedPaymentDate = body.agreedPaymentDate ? new Date(body.agreedPaymentDate) : null;
    }
    if (body.estimatedMonthlyKg !== undefined) {
      updateData.estimatedMonthlyKg = parseFloat(body.estimatedMonthlyKg || '0');
    }
    if (body.estimatedReorderCycleDays !== undefined) {
      const cycle = parseInt(body.estimatedReorderCycleDays || '30', 10);
      updateData.estimatedReorderCycleDays = cycle;
      updateData.reorderIntervalDays = cycle;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updatedShop = await prisma.shop.update({
      where: { id },
      data: updateData,
    });

    await prisma.shopActivity.create({
      data: {
        shopId: id,
        userId: salesSession?.id || 'ADMIN',
        userName: salesSession?.fullName || 'Admin',
        activityType: 'STATUS_CHANGED',
        description: `Shop profile updated: ${Object.keys(updateData).join(', ')}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Shop updated successfully', shop: updatedShop });
  } catch (error: any) {
    console.error('Shop update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update shop' }, { status: 500 });
  }
}
