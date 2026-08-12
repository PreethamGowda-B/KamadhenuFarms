import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shopId = params.id;
    const body = await req.json();
    const {
      author,
      type,
      result,
      notes,
      nextFollowUpDate: customNextDate,
    } = body;

    if (!result) {
      return NextResponse.json({ success: false, message: 'Follow-up result is required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database not available' }, { status: 500 });
    }

    const shop = await (prisma as any).shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ success: false, message: 'Shop not found' }, { status: 404 });
    }

    // Determine updated shop status based on follow-up outcome
    let newStatus: string = shop.status;
    if (result === 'ORDER_CONFIRMED' || result === 'NEEDS_STOCK') {
      newStatus = 'ORDER_CONFIRMED';
    } else if (result === 'NO_RESPONSE' || result === 'WAITING_FOR_RESPONSE') {
      newStatus = 'WAITING_FOR_RESPONSE';
    } else if (result === 'DOESNT_NEED_STOCK_NOW' || result === 'CALL_LATER') {
      newStatus = 'ACTIVE';
    } else if (result === 'NOT_INTERESTED') {
      newStatus = 'INACTIVE';
    } else if (result === 'SHOP_CLOSED') {
      newStatus = 'CLOSED';
    }

    // Determine next follow-up date
    let nextDateObj: Date | null = null;
    if (customNextDate) {
      nextDateObj = new Date(customNextDate);
    } else if (result === 'CALL_LATER') {
      // Default call later to 3 days from now
      nextDateObj = new Date(Date.now() + 3 * 86400000);
    } else if (result === 'DOESNT_NEED_STOCK_NOW') {
      // Default 15 days from now
      nextDateObj = new Date(Date.now() + 15 * 86400000);
    } else {
      // Default to standard shop reorder interval
      const intervalDays = shop.reorderIntervalDays || 30;
      nextDateObj = new Date(Date.now() + intervalDays * 86400000);
    }

    // Create FollowUp entry
    const followUp = await (prisma as any).shopFollowUp.create({
      data: {
        shopId,
        author: (author || shop.assignedSalesExecutiveName || 'Admin User').trim(),
        date: new Date(),
        type: type || 'CALL',
        result,
        notes: (notes || '').trim() || null,
        nextFollowUpDate: nextDateObj,
      },
    });

    // Update Shop Status and Next Follow-up Date
    const updatedShop = await (prisma as any).shop.update({
      where: { id: shopId },
      data: {
        status: newStatus,
        nextFollowUpDate: nextDateObj,
      },
      include: {
        orders: { orderBy: { orderDate: 'desc' } },
        followUps: { orderBy: { date: 'desc' } },
      },
    });

    // Audit log
    await logAdminAction('admin@kamadhenuhoneyfarms.in', 'SHOP_FOLLOW_UP_RECORDED', shopId, `Follow-up recorded for ${shop.shopName}: ${result}`);

    return NextResponse.json({
      success: true,
      message: 'Follow-up logged successfully',
      followUp,
      shop: updatedShop,
    });
  } catch (error: any) {
    console.error('POST /api/admin/shops/[id]/followups error:', error);
    return NextResponse.json({ success: false, message: 'Failed to log follow-up' }, { status: 500 });
  }
}
