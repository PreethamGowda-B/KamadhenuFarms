import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSalesJwt, SALES_COOKIE_NAME } from '@/lib/salesAuth';
import { checkRateLimitDistributed, resetRateLimitDistributed, getClientIp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateKey = `sales_login:${ip}`;
    const rateCheck = await checkRateLimitDistributed(rateKey, 8, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please wait 15 minutes and try again.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, mobileNumber } = body;

    if (!identifier && !mobileNumber) {
      return NextResponse.json(
        { success: false, message: 'Please provide your Sales Executive ID (e.g. KHF-2026-001) or Registered Mobile Number' },
        { status: 400 }
      );
    }

    const cleanId = (typeof identifier === 'string' ? identifier : '').trim().toUpperCase();
    const cleanDigits = (typeof mobileNumber === 'string' ? mobileNumber : (typeof identifier === 'string' ? identifier : '')).replace(/[^0-9]/g, '');
    const exactMobile10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    if (cleanId.length < 5 && !exactMobile10) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid Sales Executive ID or complete 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const orFilters: any[] = [];
    if (cleanId.length >= 5) {
      orFilters.push({ applicationNo: { equals: cleanId, mode: 'insensitive' } });
    }
    if (exactMobile10) {
      orFilters.push(
        { mobileNumber: exactMobile10 },
        { mobileNumber: `+91${exactMobile10}` },
        { mobileNumber: `91${exactMobile10}` },
        { whatsAppNumber: exactMobile10 },
        { whatsAppNumber: `+91${exactMobile10}` },
        { whatsAppNumber: `91${exactMobile10}` }
      );
    }

    // Strictly verify Candidate/Executive is explicitly HIRED or SALES_EXECUTIVE (never arbitrary substring matches)
    const agent = await prisma.application.findFirst({
      where: {
        AND: [
          { OR: orFilters },
          {
            OR: [
              { role: 'SALES_EXECUTIVE' },
              { status: 'HIRED' },
            ],
          },
        ],
      },
    });

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active Sales Executive found with these credentials. Please check your Executive ID / Mobile Number or contact Admin.',
        },
        { status: 401 }
      );
    }

    if (agent.isAuthActive === false) {
      return NextResponse.json(
        { success: false, message: 'Your field authorization is currently suspended or revoked. Please contact Admin.' },
        { status: 403 }
      );
    }

    await resetRateLimitDistributed(rateKey);

    // Ensure role is explicitly set to SALES_EXECUTIVE in DB for HIRED executives
    if (agent.role !== 'SALES_EXECUTIVE' && agent.status === 'HIRED') {
      await prisma.application.update({
        where: { id: agent.id },
        data: { role: 'SALES_EXECUTIVE' },
      });
    }

    const token = signSalesJwt({
      id: agent.id,
      applicationNo: agent.applicationNo,
      fullName: agent.fullName,
      mobileNumber: agent.mobileNumber,
      workingTerritory: agent.workingTerritory || agent.preferredSalesArea || 'Karnataka',
      role: 'SALES_EXECUTIVE',
    });

    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${agent.fullName}!`,
      salesperson: {
        id: agent.id,
        applicationNo: agent.applicationNo,
        fullName: agent.fullName,
        mobileNumber: agent.mobileNumber,
        workingTerritory: agent.workingTerritory || agent.preferredSalesArea || 'Karnataka',
        profilePhotoUrl: agent.profilePhotoUrl,
      },
    });

    res.cookies.set(SALES_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  } catch (error: any) {
    console.error('Sales login error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
