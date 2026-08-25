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

    const { reminderType = 'REORDER_DUE_TODAY', dueDate, notes = '' } = body;
    if (!dueDate) {
      return NextResponse.json({ success: false, message: 'Due date is required' }, { status: 400 });
    }

    const reminder = await prisma.shopReminder.create({
      data: {
        shopId: id,
        reminderType,
        dueDate: new Date(dueDate),
        status: 'PENDING',
        notes,
      },
    });

    return NextResponse.json({ success: true, message: 'Reminder set successfully', reminder });
  } catch (error: any) {
    console.error('Reminder create error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create reminder' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { reminderId, action, snoozeDays = 3, notes = '' } = body;
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const actorName = salesSession?.fullName || (adminSession ? 'Admin' : 'Salesperson');

    if (action === 'MARK_CONTACTED') {
      const updated = await prisma.shopReminder.updateMany({
        where: { id: reminderId, shopId: id },
        data: {
          status: 'CONTACTED',
          contactedAt: new Date(),
          contactedBy: actorName,
          notes: notes || 'Contacted via Call/WhatsApp',
        },
      });

      await prisma.shopActivity.create({
        data: {
          shopId: id,
          userId: salesSession?.id || 'ADMIN',
          userName: actorName,
          activityType: 'REMINDER_UPDATED',
          description: `Shop contacted for reorder follow-up by ${actorName}`,
        },
      });

      return NextResponse.json({ success: true, message: 'Marked as contacted', updated });
    }

    if (action === 'SNOOZE') {
      const snoozedDate = new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000);
      const updated = await prisma.shopReminder.updateMany({
        where: { id: reminderId, shopId: id },
        data: {
          status: 'SNOOZED',
          snoozedUntil: snoozedDate,
          dueDate: snoozedDate,
          notes: `Snoozed for ${snoozeDays} days: ${notes}`,
        },
      });

      await prisma.shop.update({
        where: { id },
        data: { nextReorderDate: snoozedDate },
      });

      await prisma.shopActivity.create({
        data: {
          shopId: id,
          userId: salesSession?.id || 'ADMIN',
          userName: actorName,
          activityType: 'REMINDER_UPDATED',
          description: `Reminder snoozed for ${snoozeDays} days by ${actorName}`,
        },
      });

      return NextResponse.json({ success: true, message: `Snoozed for ${snoozeDays} days`, updated });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Reminder update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update reminder' }, { status: 500 });
  }
}
