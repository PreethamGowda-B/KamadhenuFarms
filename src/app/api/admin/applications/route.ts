import { NextRequest, NextResponse } from 'next/server';
import { 
  getApplicationsStore, 
  updateApplicationStatusStore, 
  addApplicationNoteStore,
  updateApplicationWhatsAppStatusStore,
  ApplicationRecord
} from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { 
  sendEmail, 
  getHiredSelectionTemplate, 
  getPoliteRejectionTemplate, 
  getInterviewScheduleTemplate 
} from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  let apps: ApplicationRecord[] = [];

  // Query Neon PostgreSQL via Prisma if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    try {
      const dbApps = await prisma.application.findMany({
        orderBy: { createdAt: 'desc' },
        include: { notes: true, onboardingDocuments: true },
      });

      if (dbApps && dbApps.length > 0) {
        apps = dbApps.map((a) => ({
          ...a,
          notes: a.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        })) as unknown as ApplicationRecord[];
      }
    } catch (e) {
      console.error('Prisma query failed, falling back to local store:', e);
    }
  }

  if (apps.length === 0) {
    apps = getApplicationsStore();
  }

  // Compute live dynamic statistics directly from database
  const total = apps.length;
  const today = apps.filter(
    (a) => new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const shortlisted = apps.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'REVIEWED').length;
  const hired = apps.filter((a) => a.status === 'SELECTED').length;
  const rejected = apps.filter((a) => a.status === 'REJECTED').length;
  const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: apps,
    metrics: {
      total,
      today,
      shortlisted,
      hired,
      rejected,
      conversionRate,
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json();
    const { id, status, note, author, interviewDate, interviewTime, interviewLocation, interviewLink } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Application ID is required' }, { status: 400 });
    }

    let updated: ApplicationRecord | null = null;

    // Prisma DB Sync
    if (process.env.DATABASE_URL) {
      try {
        const updateData: any = {};
        if (status) updateData.status = status;
        if (interviewDate) updateData.interviewDate = interviewDate;
        if (interviewTime) updateData.interviewTime = interviewTime;
        if (interviewLocation) updateData.interviewLocation = interviewLocation;
        if (interviewLink) updateData.interviewLink = interviewLink;

        const dbRes = await prisma.application.update({
          where: { id },
          data: updateData,
          include: { notes: true },
        });

        if (dbRes) {
          updated = {
            ...dbRes,
            notes: dbRes.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
            createdAt: dbRes.createdAt.toISOString(),
            updatedAt: dbRes.updatedAt.toISOString(),
          } as unknown as ApplicationRecord;
        }
      } catch (dbErr) {
        console.error('Prisma PATCH failed, falling back to store:', dbErr);
      }
    }

    // Local Store Sync
    if (status) {
      const interviewDetails = { date: interviewDate, time: interviewTime, location: interviewLocation, link: interviewLink };
      const storeUpdated = updateApplicationStatusStore(id, status, interviewDetails);
      if (!updated) updated = storeUpdated;
    }

    if (updated && status) {
      logAdminAction(author || 'admin@kamadhenuhoneyfarms.in', `STATUS_CHANGE_${status}`, id, `New Status: ${status}`, ip);

      // Dispatches on Status Changes
      if (status === 'SELECTED') {
        const emailHtml = getHiredSelectionTemplate(updated.fullName, updated.applicationNo);
        await sendEmail({
          to: updated.email,
          subject: `Congratulations! Selected as Sales Partner - Kamadhenu Honey Farms (${updated.applicationNo})`,
          html: emailHtml,
        });

        const waRes = await sendWhatsAppMessage({
          to: updated.whatsAppNumber || updated.mobileNumber,
          name: updated.fullName,
          type: 'HIRED',
        });
        updateApplicationWhatsAppStatusStore(id, waRes.success ? 'SENT' : 'FAILED');

      } else if (status === 'REJECTED') {
        const emailHtml = getPoliteRejectionTemplate(updated.fullName, updated.applicationNo);
        await sendEmail({
          to: updated.email,
          subject: `Update regarding your Sales Agent Application - Kamadhenu Honey Farms (${updated.applicationNo})`,
          html: emailHtml,
        });

        const waRes = await sendWhatsAppMessage({
          to: updated.whatsAppNumber || updated.mobileNumber,
          name: updated.fullName,
          type: 'REJECTED',
        });
        updateApplicationWhatsAppStatusStore(id, waRes.success ? 'SENT' : 'FAILED');

      } else if (status === 'INTERVIEW_SCHEDULED') {
        const dateStr = interviewDate || 'To be confirmed';
        const timeStr = interviewTime || 'To be confirmed';
        const locStr = interviewLocation || interviewLink || 'Phone Interview Call';

        const emailHtml = getInterviewScheduleTemplate(updated.fullName, updated.applicationNo, dateStr, timeStr, locStr);
        await sendEmail({
          to: updated.email,
          subject: `Phone Interview Invitation - Kamadhenu Honey Farms (${updated.applicationNo})`,
          html: emailHtml,
        });

        const waRes = await sendWhatsAppMessage({
          to: updated.whatsAppNumber || updated.mobileNumber,
          name: updated.fullName,
          type: 'INTERVIEW_SCHEDULED',
          details: { interviewDate: dateStr, interviewTime: timeStr, location: locStr },
        });
        updateApplicationWhatsAppStatusStore(id, waRes.success ? 'SENT' : 'FAILED');
      }
    }

    if (note) {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.applicationNote.create({
            data: { applicationId: id, author: author || 'Admin', content: note },
          });
        } catch (e) {}
      }
      const storeUpdated = addApplicationNoteStore(id, author || 'Admin', note);
      if (!updated) updated = storeUpdated;
      if (updated) {
        logAdminAction(author || 'admin@kamadhenuhoneyfarms.in', 'NOTE_ADDED', id, note, ip);
      }
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
    }

    let allApps = getApplicationsStore();
    if (process.env.DATABASE_URL) {
      try {
        const dbAll = await prisma.application.findMany();
        if (dbAll && dbAll.length > 0) {
          allApps = dbAll as unknown as ApplicationRecord[];
        }
      } catch (e) {}
    }

    const total = allApps.length;
    const today = allApps.filter((a) => new Date(a.createdAt).toDateString() === new Date().toDateString()).length;
    const shortlisted = allApps.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'REVIEWED').length;
    const hired = allApps.filter((a) => a.status === 'SELECTED').length;
    const rejected = allApps.filter((a) => a.status === 'REJECTED').length;
    const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: updated,
      metrics: {
        total,
        today,
        shortlisted,
        hired,
        rejected,
        conversionRate,
      },
    });
  } catch (error: any) {
    console.error('PATCH /api/admin/applications error:', error);
    return NextResponse.json({ success: false, message: 'Failed to execute status update' }, { status: 500 });
  }
}
