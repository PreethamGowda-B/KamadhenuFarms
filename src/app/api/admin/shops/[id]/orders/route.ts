import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/audit';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Only company admin can record orders and confirm payments.' }, { status: 401 });
    }
    const shopId = params.id;
    const body = await req.json();
    const {
      product,
      quantity,
      kg,
      orderValue,
      paymentStatus,
      deliveryStatus,
      salesExecutive,
      notes,
      orderDate: customOrderDate,
    } = body;

    if (!product?.trim()) {
      return NextResponse.json({ success: false, message: 'Product description is required' }, { status: 400 });
    }

    const numQty = parseInt(quantity || '1', 10);
    const numKg = parseFloat(kg || '1');
    const numVal = parseFloat(orderValue || '0');

    if (isNaN(numQty) || numQty <= 0 || isNaN(numKg) || numKg <= 0 || isNaN(numVal) || numVal < 0) {
      return NextResponse.json({ success: false, message: 'Valid positive values for quantity, kg, and order value are required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const shop = await (prisma as any).shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    const orderDateObj = customOrderDate ? new Date(customOrderDate) : new Date();

    // Order number generation
    const orderCount = await (prisma as any).shopOrder.count();
    const numStr = String(orderCount + 1).padStart(3, '0');
    const orderNo = `ORD-2026-${numStr}`;

    // Create Order Record
    const newOrder = await (prisma as any).shopOrder.create({
      data: {
        shopId,
        orderNo,
        orderDate: orderDateObj,
        product: product.trim(),
        quantity: numQty,
        kg: numKg,
        orderValue: numVal,
        paymentStatus: paymentStatus || 'PAID',
        deliveryStatus: deliveryStatus || 'DELIVERED',
        salesExecutive: (salesExecutive || shop.assignedSalesExecutiveName || 'Admin User').trim(),
        notes: (notes || '').trim() || null,
      },
    });

    // Reorder Interval Engine: Next Follow-up Date = Order Date + Reorder Interval (Days)
    const intervalDays = shop.reorderIntervalDays || 30;
    const nextFollowUpDate = new Date(orderDateObj.getTime() + intervalDays * 86400000);

    // Update Shop Accumulators & Status
    const updatedShop = await (prisma as any).shop.update({
      where: { id: shopId },
      data: {
        lastOrderDate: orderDateObj,
        lastOrderQuantity: numKg,
        firstOrderDate: shop.firstOrderDate ? shop.firstOrderDate : orderDateObj,
        totalOrders: shop.totalOrders + 1,
        totalKgPurchased: Math.round((shop.totalKgPurchased + numKg) * 100) / 100,
        totalPurchaseValue: Math.round((shop.totalPurchaseValue + numVal) * 100) / 100,
        nextFollowUpDate,
        status: 'ORDER_CONFIRMED',
      },
      include: {
        orders: { orderBy: { orderDate: 'desc' } },
        followUps: { orderBy: { date: 'desc' } },
      },
    });

    // Audit Log
    await logAdminAction('admin@kamadhenuhoneyfarms.in', 'SHOP_ORDER_RECORDED', shopId, `Recorded order ${orderNo} (${numKg}kg - ₹${numVal}) for ${shop.shopName}`);

    return NextResponse.json({
      success: true,
      message: 'Order recorded successfully and next follow-up date updated!',
      order: newOrder,
      shop: updatedShop,
    });
  } catch (error: any) {
    console.error('POST /api/admin/shops/[id]/orders error:', error);
    return NextResponse.json({ success: false, message: 'Failed to record order' }, { status: 500 });
  }
}
