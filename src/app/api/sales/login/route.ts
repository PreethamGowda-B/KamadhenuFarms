import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSalesJwt, SALES_COOKIE_NAME } from '@/lib/salesAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, mobileNumber } = body;

    if (!identifier && !mobileNumber) {
      return NextResponse.json(
        { success: false, message: 'Please provide your Sales Executive ID (e.g. KHF-2026-001) or Registered Mobile Number' },
        { status: 400 }
      );
    }

    const cleanId = (identifier || '').trim().toUpperCase();
    const cleanMobile = (mobileNumber || identifier || '').replace(/[^0-9]/g, '');

    // Search for Candidate/Executive who is HIRED or has role SALES_EXECUTIVE
    const agent = await prisma.application.findFirst({
      where: {
        AND: [
          {
            OR: [
              { applicationNo: { equals: cleanId, mode: 'insensitive' } },
              { mobileNumber: { contains: cleanMobile } },
              { whatsAppNumber: { contains: cleanMobile } },
            ],
          },
          {
            OR: [
              { role: 'SALES_EXECUTIVE' },
              { status: 'HIRED' },
              { engagementType: { contains: 'Sales', mode: 'insensitive' } },
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
        { status: 404 }
      );
    }

    if (agent.isAuthActive === false) {
      return NextResponse.json(
        { success: false, message: 'Your field authorization is currently suspended or revoked. Please contact Admin.' },
        { status: 403 }
      );
    }

    // Ensure role is explicitly set to SALES_EXECUTIVE in DB
    if (agent.role !== 'SALES_EXECUTIVE') {
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
