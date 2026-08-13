import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getApplicationsStore } from '@/lib/store';
import { getVerificationUrl } from '@/lib/onboarding/templates';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = params;

    let candidate: any = null;
    if (process.env.DATABASE_URL) {
      try {
        candidate = await (prisma as any).application.findUnique({
          where: { id },
          include: { onboardingDocuments: true },
        });
      } catch (e) {}
    }
    if (!candidate) {
      const storeApps = getApplicationsStore();
      candidate = storeApps.find((a) => a.id === id);
    }

    if (!candidate) {
      return NextResponse.json({ success: false, message: 'Candidate application not found.' }, { status: 404 });
    }

    const verificationPath = getVerificationUrl(candidate.applicationNo);
    const verificationUrl = `https://www.kamadhenuhoneyfarms.in${verificationPath}`;

    const roleName = candidate.engagementType || 'Sales Executive (Field Sales)';
    const joiningDateStr = candidate.joiningDate || '16-Aug-2026';
    const validFromStr = candidate.authValidFrom || joiningDateStr;
    const validUntilStr = candidate.authValidUntil || '15-Feb-2027';

    // Auto-approve DRAFT documents on explicit admin send action
    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).onboardingDocument.updateMany({
          where: { applicationId: id, status: 'DRAFT' },
          data: { status: 'APPROVED', approvedBy: session.email, approvedAt: new Date() },
        });
      } catch (e) {}
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 2px solid #d4af37; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a202c, #2d3748); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; color: #d4af37;">KAMADHENU HONEY FARMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e0;">Official Candidate Onboarding & Field Authorization</p>
        </div>
        <div style="padding: 24px; color: #2d3748; line-height: 1.6; font-size: 14px;">
          <p>Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Congratulations! We are delighted to welcome you to <strong>Kamadhenu Honey Farms</strong> as a <strong>${roleName}</strong>.</p>
          <p>Your official onboarding documents have been generated and approved by management:</p>
          <ul style="background-color: #faf8f2; border: 1px solid #edd99b; border-radius: 8px; padding: 16px 16px 16px 36px;">
            <li>Offer & Sales Engagement Letter</li>
            <li>Official Sales Authorization Letter</li>
            <li>Commission Policy & Tier Structure (₹100/kg – ₹150/kg)</li>
            <li>Official Product & Price Catalogue (Pure Raw Honey)</li>
            <li>Sales Reporting & Field Guidelines</li>
            <li>Sales Executive Code of Conduct</li>
          </ul>
          <p><strong>Approved Engagement Summary:</strong></p>
          <p style="background: #f7fafc; padding: 14px; border-left: 4px solid #d4af37; border-radius: 4px; font-size: 13px;">
            <strong>Designated Role:</strong> ${roleName}<br/>
            <strong>Joining Date:</strong> ${joiningDateStr}<br/>
            <strong>Authorization Period (6 Months):</strong> ${validFromStr} → ${validUntilStr}<br/>
            <strong>Working Territory:</strong> ${candidate.workingTerritory || candidate.city}<br/>
            <strong>Reporting Manager:</strong> ${candidate.reportingManager || 'Area Sales Manager'}<br/>
            <strong>Payout Frequency:</strong> ${candidate.payoutFrequency || 'Weekly'}
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verificationUrl}" target="_blank" style="background-color: #b8860b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              View Digital Authorization & Live QR Verification Seal
            </a>
          </div>
          <p>Please review and keep these approved documents for your official records.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #718096;">
            Warm Regards,<br/>
            <strong>Kamadhenu Honey Farms Recruitment Team</strong><br/>
            Farm Address: Cholanayakanahalli, Magadi Main Road, Thavarekere, Bangalore Urban - 562130<br/>
            Email: kamadhenuhoneyfarms@gmail.com | Phone: +91 9980114675 / +91 9535134351
          </p>
        </div>
      </div>
    `;

    let emailDelivered = false;
    try {
      const sendRes = await sendEmail({
        to: candidate.email,
        subject: `Kamadhenu Honey Farms — Sales Executive Onboarding Documents (${candidate.applicationNo})`,
        html: emailHtml,
      });
      emailDelivered = sendRes.success;
    } catch (sendErr) {
      console.error('Document dispatch error:', sendErr);
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).application.update({
          where: { id },
          data: { onboardingStatus: emailDelivered ? 'DOCUMENTS_SENT' : 'DETAILS_PENDING' },
        });

        await (prisma as any).onboardingDocument.updateMany({
          where: { applicationId: id },
          data: {
            status: emailDelivered ? 'SENT' : 'APPROVED',
            sentAt: emailDelivered ? new Date() : null,
            sentTo: candidate.email,
            sentBy: session.email,
            sentStatus: emailDelivered ? 'SENT' : 'FAILED',
          },
        });
      } catch (e) {}
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, 'DOCUMENTS_SENT_TO_CANDIDATE', id, `Sent to: ${candidate.email} | Status: ${emailDelivered ? 'SENT' : 'FAILED'}`, ip);

    if (!emailDelivered) {
      return NextResponse.json({
        success: false,
        message: `Email sending failed — documents were approved, but the notification could not be delivered to candidate email (${candidate.email}).`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Onboarding documents successfully approved and dispatched to candidate email (${candidate.email}).`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/documents/send error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send documents to candidate.' }, { status: 500 });
  }
}
