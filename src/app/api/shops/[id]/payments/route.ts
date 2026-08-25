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
      amount,
      paymentMethod = 'CASH',
      reference = '',
      notes = '',
      orderId,
      paymentDate = new Date().toISOString(),
    } = body;

    const numAmount = parseFloat(amount || '0');
    if (numAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Valid positive payment amount required' }, { status: 400 });
    }

    const recordedBy = salesSession?.fullName || body.recordedBy || (adminSession ? 'Admin' : 'Field Sales');

    const result = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id } });
      if (!shop) throw new Error('Shop not found');

      // Create Payment Record
      const newPayment = await tx.shopPayment.create({
        data: {
          shopId: id,
          orderId: orderId || null,
          amount: numAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference: reference || null,
          notes: notes || null,
          recordedBy,
        },
      });

      // Recalculate Shop outstanding and total paid
      const updatedOutstanding = Math.max(0, shop.outstandingAmount - numAmount);
      const updatedPaid = shop.totalPaidAmount + numAmount;

      await tx.shop.update({
        where: { id },
        data: {
          outstandingAmount: updatedOutstanding,
          totalPaidAmount: updatedPaid,
        },
      });

      // If tied to an order, update order status
      if (orderId) {
        const order = await tx.shopOrder.findUnique({ where: { id: orderId } });
        if (order) {
          const totalOrderPayments = await tx.shopPayment.aggregate({
            where: { orderId },
            _sum: { amount: true },
          });
          const totalPaidForOrder = totalOrderPayments._sum.amount || 0;

          let newStatus = order.paymentStatus;
          if (totalPaidForOrder >= (order.totalAmount || order.orderValue || 0)) {
            newStatus = 'PAID';
          } else if (totalPaidForOrder > 0) {
            newStatus = 'PARTIAL';
          }

          await tx.shopOrder.update({
            where: { id: orderId },
            data: { paymentStatus: newStatus },
          });
        }
      }

      // Log Activity
      await tx.shopActivity.create({
        data: {
          shopId: id,
          userId: salesSession?.id || 'ADMIN',
          userName: recordedBy,
          activityType: 'PAYMENT_RECORDED',
          description: `Payment of ₹${numAmount.toLocaleString('en-IN')} received via ${paymentMethod}. Outstanding balance: ₹${updatedOutstanding.toLocaleString('en-IN')}`,
        },
      });

      return { payment: newPayment, outstandingAmount: updatedOutstanding, totalPaidAmount: updatedPaid };
    });

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment: result.payment,
      outstandingAmount: result.outstandingAmount,
      totalPaidAmount: result.totalPaidAmount,
    });
  } catch (error: any) {
    console.error('Payment record error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to record payment' }, { status: 500 });
  }
}
