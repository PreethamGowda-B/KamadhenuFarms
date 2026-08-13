import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApplicationsStore } from '@/lib/store';
import { 
  sendEmail, 
  getHiredSelectionTemplate, 
  getPoliteRejectionTemplate, 
  getInterviewScheduleTemplate 
} from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { type, date, time, location } = body;

    let app: any = null;

    // 1. Check Neon PostgreSQL Database
    if (process.env.DATABASE_URL) {
      try {
        app = await (prisma as any).application.findUnique({
          where: { id },
        });
      } catch (e) {
        console.error('Prisma query error in candidate email route:', e);
      }
    }

    // 2. Fallback to Local Store
    if (!app) {
      const apps = getApplicationsStore();
      app = apps.find((a) => a.id === id);
    }

    if (!app) {
      return NextResponse.json({ success: false, message: 'Candidate application not found' }, { status: 404 });
    }

    let subject = '';
    let html = '';

    if (type === 'interview') {
      const interviewDate = date || app.interviewDate || 'Tomorrow';
      const interviewTime = time || app.interviewTime || '11:00 AM';
      const interviewLoc = location || app.interviewLocation || 'Phone Call / WhatsApp';

      subject = `Phone Interview Invitation - Kamadhenu Honey Farms (${app.applicationNo})`;
      html = getInterviewScheduleTemplate(app.fullName, app.applicationNo, interviewDate, interviewTime, interviewLoc);
    } else if (type === 'select') {
      subject = `Congratulations! Selected as Sales Executive (Field Sales) - Kamadhenu Honey Farms (${app.applicationNo})`;
      html = getHiredSelectionTemplate(app.fullName, app.applicationNo);
    } else if (type === 'reject') {
      subject = `Application Status Update - Kamadhenu Honey Farms (${app.applicationNo})`;
      html = getPoliteRejectionTemplate(app.fullName, app.applicationNo);
    } else {
      return NextResponse.json({ success: false, message: 'Invalid email action type' }, { status: 400 });
    }

    const result = await sendEmail({ to: app.email, subject, html });

    // 3. Update hiring email status in Database
    if (type === 'select' || type === 'hired') {
      if (process.env.DATABASE_URL) {
        try {
          await (prisma as any).application.update({
            where: { id },
            data: {
              hiringEmailStatus: 'SENT',
              hiringEmailSentAt: new Date(),
            },
          });
        } catch (dbUpdateErr) {
          console.error('Failed to update hiring email status in DB:', dbUpdateErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Candidate ${type} email dispatched successfully to ${app.email}`,
      result,
    });
  } catch (error: any) {
    console.error('API /api/admin/applications/[id]/email error:', error);
    return NextResponse.json({ success: false, message: 'Failed to dispatch email' }, { status: 500 });
  }
}
