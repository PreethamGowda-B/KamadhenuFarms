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
      purpose = 'ROUTINE_FOLLOW_UP',
      discussion = '',
      orderTaken = false,
      paymentCollected = 0,
      nextFollowUpDate,
      imageUrl,
      notes = '',
      visitDate = new Date().toISOString(),
    } = body;

    if (!discussion.trim()) {
      return NextResponse.json({ success: false, message: 'Visit discussion details are required' }, { status: 400 });
    }

    const salespersonName = salesSession?.fullName || body.salespersonName || (adminSession ? 'Admin' : 'Field Sales');
    const salespersonId = salesSession?.id || body.salespersonId || null;

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.shopVisit.create({
        data: {
          shopId: id,
          salespersonId,
          salespersonName,
          visitDate: new Date(visitDate),
          purpose,
          discussion,
          orderTaken: Boolean(orderTaken),
          paymentCollected: parseFloat(paymentCollected || '0'),
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
          imageUrl: imageUrl || null,
          notes,
        },
      });

      if (nextFollowUpDate) {
        await tx.shop.update({
          where: { id },
          data: {
            nextFollowUpDate: new Date(nextFollowUpDate),
          },
        });
      }

      await tx.shopActivity.create({
        data: {
          shopId: id,
          userId: salespersonId || 'ADMIN',
          userName: salespersonName,
          activityType: 'VISIT_LOGGED',
          description: `Shop visited by ${salespersonName}. Purpose: ${purpose}. Order taken: ${orderTaken ? 'Yes' : 'No'}. Next follow-up: ${nextFollowUpDate ? new Date(nextFollowUpDate).toLocaleDateString('en-IN') : 'None'}`,
        },
      });

      return visit;
    });

    return NextResponse.json({ success: true, message: 'Visit logged successfully', visit: result });
  } catch (error: any) {
    console.error('Visit log error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to log visit' }, { status: 500 });
  }
}
