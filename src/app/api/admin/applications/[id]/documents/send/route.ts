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
    const verificationUrl = `https://kamadhenuhoneyfarms.in${verificationPath}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #d4af37; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a202c, #2d3748); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; color: #d4af37;">KAMADHENU HONEY FARMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e0;">Official Candidate Onboarding & Field Authorization</p>
        </div>
        <div style="padding: 24px; color: #2d3748; line-height: 1.6; font-size: 14px;">
          <p>Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Congratulations! We are delighted to welcome you to <strong>Kamadhenu Honey Farms</strong> as a <strong>${candidate.engagementType || 'Sales Executive'}</strong>.</p>
          <p>Your official onboarding documents have been generated and approved by management:</p>
          <ul style="background-color: #faf8f2; border: 1px solid #edd99b; border-radius: 8px; padding: 16px 16px 16px 36px;">
            <li>Offer & Sales Engagement Letter</li>
            <li>Official Sales Authorization Letter</li>
            <li>Commission Policy & Tier Structure (₹100/kg - ₹150/kg)</li>
            <li>Product & Price Catalogue</li>
            <li>Sales Reporting & Field Guidelines</li>
            <li>Sales Executive Code of Conduct</li>
          </ul>
          <p><strong>Engagement Terms Summary:</strong></p>
          <p style="background: #f7fafc; padding: 12px; border-left: 4px solid #d4af37; border-radius: 4px; font-size: 13px;">
            <strong>Joining Date:</strong> ${candidate.joiningDate || 'Immediate'}<br/>
            <strong>Working Territory:</strong> ${candidate.workingTerritory || candidate.city}<br/>
            <strong>Reporting Manager:</strong> ${candidate.reportingManager || 'Regional Manager'}<br/>
            <strong>Payout Frequency:</strong> ${candidate.payoutFrequency || 'Weekly'}
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verificationUrl}" target="_blank" style="background-color: #b8860b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              View Digital Authorization & Verification Seal
            </a>
          </div>
          <p>Please review, sign, and accept your document pack to complete your onboarding process.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #718096;">
            Warm Regards,<br/>
            <strong>Kamadhenu Honey Farms Recruitment Team</strong><br/>
            Mandya District, Karnataka | contact@kamadhenuhoneyfarms.in
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: candidate.email,
      subject: `Official Candidate Onboarding & Authorization Pack - Kamadhenu Honey Farms (${candidate.applicationNo})`,
      html: emailHtml,
    });

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).application.update({
          where: { id },
          data: { onboardingStatus: 'DOCUMENTS_SENT' },
        });

        await (prisma as any).onboardingDocument.updateMany({
          where: { applicationId: id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (e) {}
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, 'DOCUMENTS_SENT_TO_CANDIDATE', id, `Sent to: ${candidate.email}`, ip);

    return NextResponse.json({
      success: true,
      message: `Onboarding documents successfully dispatched to candidate email (${candidate.email}).`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/documents/send error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send documents to candidate.' }, { status: 500 });
  }
}
