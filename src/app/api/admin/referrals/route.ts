import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const [offers, usages, rewards] = await Promise.all([
      prisma.referralOffer.findMany({
        include: {
          referrerCustomer: {
            select: { id: true, name: true, mobile: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.referralUsage.findMany({
        include: {
          offer: true,
          order: {
            select: { orderNumber: true, total: true, paymentStatus: true, createdAt: true },
          },
          referrerCustomer: {
            select: { id: true, name: true, mobile: true },
          },
          referredCustomer: {
            select: { id: true, name: true, mobile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.referralReward.findMany({
        include: {
          customer: {
            select: { id: true, name: true, mobile: true },
          },
          offer: {
            select: { code: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Calculate Referral Metrics
    const totalOffers = offers.length;
    const activeOffers = offers.filter((o) => o.isActive).length;
    const totalUsed = offers.reduce((sum, o) => sum + o.timesUsed, 0);
    const qualifiedReferrals = usages.filter((u) => u.status === 'QUALIFIED' || u.status === 'QUALIFIED_GLOBAL').length;
    const pendingReferrals = usages.filter((u) => u.status === 'PENDING').length;
    const rewardsEarned = rewards.length;
    const rewardsUsed = rewards.filter((r) => r.isUsed).length;

    return NextResponse.json({
      success: true,
      offers,
      usages,
      rewards,
      metrics: {
        totalOffers,
        activeOffers,
        totalUsed,
        qualifiedReferrals,
        pendingReferrals,
        rewardsEarned,
        rewardsUsed,
      },
    });
  } catch (error: any) {
    console.error('Admin referrals fetch error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      code,
      discountPercent = 5.0,
      minPurchaseKg = 1.0,
      rewardType = 'DISCOUNT_NEXT_PURCHASE',
      startDate,
      expiryDate,
      usageLimit,
      isActive = true,
      description,
      referrerCustomerId,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { success: false, message: 'Referral code is required' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if code already exists
    const existing = await prisma.referralOffer.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Referral code "${cleanCode}" already exists` },
        { status: 400 }
      );
    }

    const offer = await prisma.referralOffer.create({
      data: {
        code: cleanCode,
        discountPercent: Number(discountPercent) || 5.0,
        minPurchaseKg: Number(minPurchaseKg) || 1.0,
        rewardType,
        startDate: startDate ? new Date(startDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        isActive: Boolean(isActive),
        description: description?.trim() || null,
        referrerCustomerId: referrerCustomerId || null,
      },
      include: {
        referrerCustomer: true,
      },
    });

    return NextResponse.json({
      success: true,
      offer,
      message: `Referral offer "${offer.code}" created and set to ${offer.isActive ? 'ACTIVE' : 'INACTIVE'}!`,
    });
  } catch (error: any) {
    console.error('Create referral offer error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create referral offer' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, isActive, discountPercent, minPurchaseKg, expiryDate, usageLimit, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (discountPercent !== undefined) updateData.discountPercent = Number(discountPercent);
    if (minPurchaseKg !== undefined) updateData.minPurchaseKg = Number(minPurchaseKg);
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.referralOffer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      offer: updated,
      message: `Referral offer "${updated.code}" updated successfully`,
    });
  } catch (error: any) {
    console.error('Update referral offer error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update referral offer' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin session required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Offer ID is required' },
        { status: 400 }
      );
    }

    await prisma.referralOffer.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Referral offer deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete referral offer error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete referral offer' },
      { status: 500 }
    );
  }
}
