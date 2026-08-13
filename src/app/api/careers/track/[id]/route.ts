import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApplicationsStore } from '@/lib/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params.id ? params.id.trim() : '';

    if (!rawId) {
      return NextResponse.json({ success: false, message: 'Application ID is required' }, { status: 400 });
    }

    let foundApp: any = null;

    // 1. Search PostgreSQL via Prisma
    if (process.env.DATABASE_URL) {
      try {
        const dbRes = await prisma.application.findFirst({
          where: {
            applicationNo: {
              equals: rawId,
              mode: 'insensitive',
            },
          },
        });

        if (dbRes) {
          foundApp = dbRes;
        }
      } catch (dbErr) {
        console.error('Prisma tracking lookup error:', dbErr);
      }
    }

    // 2. Local store fallback if Prisma database offline
    if (!foundApp) {
      const allApps = getApplicationsStore();
      foundApp = allApps.find(
        (a) => a.applicationNo.toLowerCase() === rawId.toLowerCase()
      );
    }

    if (!foundApp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Application not found',
        },
        { status: 404 }
      );
    }

    // 3. Strict Security Filter: Exclude sensitive PII (Aadhaar, phone, email, internal HR notes, resume URLs)
    const publicTrackingData = {
      applicationNo: foundApp.applicationNo,
      fullName: foundApp.fullName,
      status: foundApp.status,
      position: 'Sales Executive (Field Sales)',
      interviewDate: foundApp.interviewDate || null,
      interviewTime: foundApp.interviewTime || null,
      interviewLocation: foundApp.interviewLocation || null,
      interviewLink: foundApp.interviewLink || null,
      createdAt: foundApp.createdAt ? new Date(foundApp.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: foundApp.updatedAt ? new Date(foundApp.updatedAt).toISOString() : new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: publicTrackingData,
    });
  } catch (error: any) {
    console.error('GET /api/careers/track/[id] error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error while checking application status' },
      { status: 500 }
    );
  }
}
