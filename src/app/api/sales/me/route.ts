import { NextRequest, NextResponse } from 'next/server';
import { getSalesSessionFromRequest, SALES_COOKIE_NAME } from '@/lib/salesAuth';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Check Salesperson Session
    const salesSession = await getSalesSessionFromRequest(req);
    if (salesSession) {
      const agent = await prisma.application.findUnique({
        where: { id: salesSession.id },
        select: {
          id: true,
          applicationNo: true,
          fullName: true,
          mobileNumber: true,
          workingTerritory: true,
          preferredSalesArea: true,
          profilePhotoUrl: true,
          status: true,
          role: true,
          isAuthActive: true,
        },
      });

      if (!agent || agent.isAuthActive === false) {
        return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        authenticated: true,
        role: 'SALES_EXECUTIVE',
        salesperson: {
          id: agent.id,
          applicationNo: agent.applicationNo,
          fullName: agent.fullName,
          mobileNumber: agent.mobileNumber,
          workingTerritory: agent.workingTerritory || agent.preferredSalesArea || 'Karnataka',
          profilePhotoUrl: agent.profilePhotoUrl,
        },
      });
    }

    // 2. Fallback: Check Admin Session
    const adminSession = getAdminSessionFromRequest(req);
    if (adminSession) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        role: 'ADMIN',
        admin: adminSession,
        salesperson: {
          id: 'ADMIN',
          applicationNo: 'KHF-ADMIN-01',
          fullName: 'Kamadhenu Admin',
          mobileNumber: '9999999999',
          workingTerritory: 'All Karnataka',
        },
      });
    }

    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  } catch (error: any) {
    console.error('Sales me error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
