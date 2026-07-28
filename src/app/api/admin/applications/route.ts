import { NextRequest, NextResponse } from 'next/server';
import { 
  getApplicationsStore, 
  updateApplicationStatusStore, 
  addApplicationNoteStore,
  updateApplicationWhatsAppStatusStore,
  ApplicationRecord
} from '@/lib/store';
import { 
  sendEmail, 
  getHiredSelectionTemplate, 
  getPoliteRejectionTemplate, 
  getInterviewScheduleTemplate 
} from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  const apps = getApplicationsStore();

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

    // Handle Status Change & Interview Scheduling
    if (status) {
      const interviewDetails = {
        date: interviewDate,
        time: interviewTime,
        location: interviewLocation,
        link: interviewLink,
      };

      updated = updateApplicationStatusStore(id, status, interviewDetails);

      if (updated) {
        // Audit log entry
        logAdminAction(author || 'admin@kamadhenuhoneyfarms.in', `STATUS_CHANGE_${status}`, id, `New Status: ${status}`, ip);

        // Dispatches on Status Changes:
        if (status === 'SELECTED') {
          // 1. Email
          const emailHtml = getHiredSelectionTemplate(updated.fullName, updated.applicationNo);
          await sendEmail({
            to: updated.email,
            subject: `Congratulations! Selected as Sales Partner - Kamadhenu Honey Farms (${updated.applicationNo})`,
            html: emailHtml,
          });

          // 2. WhatsApp
          const waRes = await sendWhatsAppMessage({
            to: updated.whatsAppNumber || updated.mobileNumber,
            name: updated.fullName,
            type: 'HIRED',
          });
          updateApplicationWhatsAppStatusStore(id, waRes.success ? 'SENT' : 'FAILED');

        } else if (status === 'REJECTED') {
          // 1. Email
          const emailHtml = getPoliteRejectionTemplate(updated.fullName, updated.applicationNo);
          await sendEmail({
            to: updated.email,
            subject: `Update regarding your Sales Agent Application - Kamadhenu Honey Farms (${updated.applicationNo})`,
            html: emailHtml,
          });

          // 2. WhatsApp
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

          // 1. Email
          const emailHtml = getInterviewScheduleTemplate(updated.fullName, updated.applicationNo, dateStr, timeStr, locStr);
          await sendEmail({
            to: updated.email,
            subject: `Phone Interview Invitation - Kamadhenu Honey Farms (${updated.applicationNo})`,
            html: emailHtml,
          });

          // 2. WhatsApp
          const waRes = await sendWhatsAppMessage({
            to: updated.whatsAppNumber || updated.mobileNumber,
            name: updated.fullName,
            type: 'INTERVIEW_SCHEDULED',
            details: { interviewDate: dateStr, interviewTime: timeStr, location: locStr },
          });
          updateApplicationWhatsAppStatusStore(id, waRes.success ? 'SENT' : 'FAILED');
        }
      }
    }

    // Handle Internal Note Addition
    if (note) {
      updated = addApplicationNoteStore(id, author || 'Admin', note);
      if (updated) {
        logAdminAction(author || 'admin@kamadhenuhoneyfarms.in', 'NOTE_ADDED', id, note, ip);
      }
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
    }

    // Re-fetch all to calculate fresh live metrics after mutation
    const allApps = getApplicationsStore();
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
