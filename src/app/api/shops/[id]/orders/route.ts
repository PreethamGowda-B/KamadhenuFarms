import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const {
      items = [],
      paymentMethod = 'CASH',
      paymentStatus = 'PAID',
      dueDate,
      orderDate = new Date().toISOString(),
      notes = '',
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one product item is required' }, { status: 400 });
    }

    // Validate quantities and prices
    let totalAmount = 0;
    let totalKg = 0;
    const validItems: any[] = [];

    for (const item of items) {
      const qty = Math.max(0, parseInt(item.quantity || '0', 10));
      const unitPrice = Math.max(0, parseFloat(item.unitPrice || '0'));
      const kgPerUnit = parseFloat(item.kgPerUnit || '0.5');
      if (qty > 0 && unitPrice >= 0) {
        const itemTotal = qty * unitPrice;
        const itemKg = qty * kgPerUnit;
        totalAmount += itemTotal;
        totalKg += itemKg;
        validItems.push({
          productName: item.productName || 'Pure Honey',
          quantity: qty,
          unitPrice,
          totalPrice: itemTotal,
          kg: itemKg,
        });
      }
    }

    if (validItems.length === 0) {
      return NextResponse.json({ success: false, message: 'Valid item quantity and price required' }, { status: 400 });
    }

    const salespersonName = salesSession?.fullName || body.salespersonName || (adminSession ? 'Admin' : 'Sales Executive');
    const salespersonId = salesSession?.id || body.salespersonId || null;
    const parsedOrderDate = new Date(orderDate);

    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id } });
      if (!shop) throw new Error('Shop not found');

      // Generate atomic Order Number
      const seq = await tx.shopSequence.upsert({
        where: { id: 1 },
        update: { lastSeq: { increment: 1 } },
        create: { id: 1, lastSeq: 1 },
      });
      const orderNo = `ORD-${parsedOrderDate.getFullYear()}-${String(seq.lastSeq).padStart(6, '0')}`;

      // Create Order
      const newOrder = await tx.shopOrder.create({
        data: {
          shopId: id,
          orderNo,
          orderDate: parsedOrderDate,
          product: validItems.map(i => `${i.quantity}x ${i.productName}`).join(', '),
          quantity: validItems.reduce((acc, i) => acc + i.quantity, 0),
          kg: totalKg,
          orderValue: totalAmount,
          totalAmount,
          paymentMethod,
          paymentStatus,
          deliveryStatus: 'DELIVERED',
          dueDate: dueDate ? new Date(dueDate) : null,
          salespersonId,
          salesExecutive: salespersonName,
          notes,
          items: {
            create: validItems,
          },
        },
      });

      // If PAID immediately, record payment
      if (paymentStatus === 'PAID') {
        await tx.shopPayment.create({
          data: {
            shopId: id,
            orderId: newOrder.id,
            amount: totalAmount,
            paymentDate: parsedOrderDate,
            paymentMethod,
            reference: 'Order Direct Settlement',
            notes: `Paid at order time by ${paymentMethod}`,
            recordedBy: salespersonName,
          },
        });
      }

      // Fetch all historical orders for adaptive reorder forecasting
      const allOrders = await tx.shopOrder.findMany({
        where: { shopId: id },
        orderBy: { orderDate: 'asc' },
        select: { orderDate: true },
      });

      let actualAvgInterval: number | null = null;
      let calculatedNextReorderDate: Date;

      if (allOrders.length >= 2) {
        let totalDiffDays = 0;
        for (let i = 1; i < allOrders.length; i++) {
          const diffMs = allOrders[i].orderDate.getTime() - allOrders[i - 1].orderDate.getTime();
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          totalDiffDays += diffDays;
        }
        actualAvgInterval = Math.max(1, Math.round(totalDiffDays / (allOrders.length - 1)));
        calculatedNextReorderDate = new Date(parsedOrderDate.getTime() + actualAvgInterval * 24 * 60 * 60 * 1000);
      } else {
        const initialCycle = shop.estimatedReorderCycleDays || shop.reorderIntervalDays || 30;
        calculatedNextReorderDate = new Date(parsedOrderDate.getTime() + initialCycle * 24 * 60 * 60 * 1000);
      }

      // Update Shop aggregate financials and forecasting
      const updatedOutstanding = paymentStatus === 'PAID' ? shop.outstandingAmount : shop.outstandingAmount + totalAmount;
      const updatedPaid = paymentStatus === 'PAID' ? shop.totalPaidAmount + totalAmount : shop.totalPaidAmount;

      await tx.shop.update({
        where: { id },
        data: {
          totalOrders: { increment: 1 },
          totalKgPurchased: { increment: totalKg },
          totalPurchaseValue: { increment: totalAmount },
          totalBilledAmount: { increment: totalAmount },
          totalPaidAmount: updatedPaid,
          outstandingAmount: updatedOutstanding,
          lastOrderDate: parsedOrderDate,
          lastOrderQuantity: totalKg,
          firstOrderDate: shop.firstOrderDate || parsedOrderDate,
          actualAvgReorderIntervalDays: actualAvgInterval,
          nextReorderDate: calculatedNextReorderDate,
          status: 'ORDER_CONFIRMED',
        },
      });

      // Log Activity
      await tx.shopActivity.create({
        data: {
          shopId: id,
          userId: salespersonId || 'ADMIN',
          userName: salespersonName,
          activityType: 'ORDER_PLACED',
          description: `Order ${orderNo} placed for ₹${totalAmount.toLocaleString('en-IN')} (${totalKg}kg). Payment: ${paymentStatus}. Next reorder estimated: ${calculatedNextReorderDate.toLocaleDateString('en-IN')}`,
        },
      });

      // Create Reorder Reminder
      await tx.shopReminder.create({
        data: {
          shopId: id,
          reminderType: 'REORDER_DUE_TODAY',
          dueDate: calculatedNextReorderDate,
          status: 'PENDING',
          notes: `Automated reorder forecast based on ${allOrders.length >= 2 ? `historical average (${actualAvgInterval} days)` : 'estimated cycle'}`,
        },
      });

      return { order: newOrder, orderNo, nextReorderDate: calculatedNextReorderDate, actualAvgInterval };
    });

    return NextResponse.json({
      success: true,
      message: 'Order created successfully and reorder schedule updated!',
      order: result.order,
      orderNo: result.orderNo,
      nextReorderDate: result.nextReorderDate,
      actualAvgInterval: result.actualAvgInterval,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create order' }, { status: 500 });
  }
}
