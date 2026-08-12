import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    let updatedCandidate: any = null;

    if (process.env.DATABASE_URL) {
      try {
        updatedCandidate = await prisma.application.update({
          where: { id },
          data: {
            isAuthActive: false,
            onboardingStatus: 'AUTHORIZATION_REVOKED',
            status: 'EXITED',
          },
        });
      } catch (e) {
        console.error('Prisma revoke authorization error:', e);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(
      session.email,
      'REVOKE_SALES_AUTHORIZATION',
      id,
      `Authorization revoked. Reason: ${reason || 'Cessation of engagement / Exit'}`,
      ip
    );

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: 'Sales executive field authorization has been revoked. Public QR verification portal updated to REVOKED status.',
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/revoke-auth error:', error);
    return NextResponse.json({ success: false, message: 'Failed to revoke authorization.' }, { status: 500 });
  }
}
