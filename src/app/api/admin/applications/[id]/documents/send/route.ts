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
      } catch (e) {
        console.error('Prisma candidate lookup error:', e);
      }
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
    const joiningDateStr = candidate.joiningDate || '13-Aug-2026';
    const validFromStr = candidate.authValidFrom || joiningDateStr;
    const validUntilStr = candidate.authValidUntil || '12-Feb-2027';

    // Auto-approve DRAFT documents on explicit admin send action
    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).onboardingDocument.updateMany({
          where: { applicationId: id, status: 'DRAFT' },
          data: { status: 'APPROVED', approvedBy: session.email, approvedAt: new Date() },
        });
      } catch (e) {
        console.error('Draft documents approval error:', e);
      }
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 30px; color: #2E2E2E;">
        <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 35px; border: 1.5px solid #D8A64F; box-shadow: 0 12px 35px rgba(182, 133, 47, 0.15);">
          
          <!-- Header Banner -->
          <div style="text-align: center; margin-bottom: 25px; background: linear-gradient(135deg, #FAF6EE 0%, #FFFDF9 100%); padding: 22px; border-radius: 14px; border: 1px solid #F3E2B6;">
            <h1 style="color: #B6852F; margin: 0; font-size: 28px; font-family: Georgia, serif;">🍯 KAMADHENU HONEY FARMS</h1>
            <p style="color: #6A471A; font-size: 13px; margin-top: 6px; font-weight: 600; letter-spacing: 0.5px;">Official Candidate Onboarding & Field Authorization Pack</p>
          </div>

          <h2 style="color: #2E2E2E; font-size: 22px; font-family: Georgia, serif; text-align: center; margin: 20px 0 10px 0;">Official Field Authorization Issued 🎉</h2>

          <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">Dear <strong>${candidate.fullName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #4A4A4A;">Congratulations! Management has officially approved your appointment and field authorization as a <strong>${roleName}</strong> with <strong>Kamadhenu Honey Farms</strong> (Ref: <strong>${candidate.applicationNo}</strong>).</p>

          <!-- Approved Onboarding Terms Box -->
          <div style="background-color: #FDF9F0; border-left: 5px solid #D8A64F; padding: 20px; margin: 25px 0; border-radius: 10px; border: 1px solid #F3E7D0;">
            <h3 style="margin: 0 0 12px 0; color: #B6852F; font-size: 16px; font-family: Georgia, serif;">Approved Onboarding Terms & Engagement Summary</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4A3113; line-height: 1.8;">
              <li><strong>Designated Role:</strong> ${roleName}</li>
              <li><strong>Joining Date:</strong> ${joiningDateStr}</li>
              <li><strong>Authorization Period (6 Calendar Months):</strong> ${validFromStr} → ${validUntilStr}</li>
              <li><strong>Working Territory:</strong> ${candidate.workingTerritory || candidate.preferredSalesArea || candidate.city}</li>
              <li><strong>Commission Structure:</strong> ${candidate.commissionRate || '₹100/kg - ₹150/kg'}</li>
              <li><strong>Payout Schedule:</strong> ${candidate.payoutFrequency || 'Weekly (Every Monday)'}</li>
              <li><strong>Reporting Manager:</strong> ${candidate.reportingManager || 'Regional Sales Manager'}</li>
            </ul>
          </div>

          <!-- Live QR Verification Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #D8A64F 0%, #B6852F 100%); color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 15px; box-shadow: 0 6px 20px rgba(182, 133, 47, 0.35);">
              View Digital Authorization & Live QR Verification Seal 🛡️
            </a>
          </div>

          <!-- Approved Document Pack List -->
          <div style="background: #FAF8F5; padding: 22px; border-radius: 12px; border: 1px solid #F0E6D2; margin: 25px 0;">
            <h4 style="color: #B6852F; font-size: 15px; margin: 0 0 12px 0; font-family: Georgia, serif;">Included Approved Document Set:</h4>
            <ul style="line-height: 1.8; color: #4A4A4A; padding-left: 20px; margin: 0; font-size: 13px;">
              <li>📜 <strong>Offer & Sales Engagement Letter</strong></li>
              <li>🛡️ <strong>Official Sales Authorization Letter</strong> (with Scannable QR Code)</li>
              <li>💵 <strong>Sales Commission Policy & Structure</strong> (₹100–₹150/kg Tiers)</li>
              <li>🍯 <strong>Official Product & Price Catalogue</strong> (Pure Raw Honey)</li>
              <li>📊 <strong>Sales Reporting & Field Guidelines</strong></li>
              <li>⚖️ <strong>Sales Executive Code of Conduct</strong></li>
            </ul>
          </div>

          <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 30px 0 20px 0;" />

          <p style="font-size: 13px; color: #4A4A4A; margin-bottom: 6px;">Need onboarding support or order assistance?</p>
          <p style="font-size: 13px; color: #B6852F; margin: 0; line-height: 1.6;">
            📞 <strong>Phone / WhatsApp:</strong> +91 9980114675 / +91 9535134351<br/>
            ✉️ <strong>Email:</strong> kamadhenuhoneyfarms@gmail.com
          </p>

          <hr style="border: 0; border-top: 1px solid #F3E2B6; margin: 20px 0;" />

          <p style="font-size: 11px; color: #8F6321; text-align: center; margin: 0; line-height: 1.5;">
            <strong>Kamadhenu Honey Farms</strong><br/>
            Farm Address: Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore Urban, KA - 562130
          </p>
        </div>
      </div>
    `;

    let emailDelivered = false;
    let emailResult = null;
    try {
      emailResult = await sendEmail({
        to: candidate.email,
        subject: `Kamadhenu Honey Farms — Sales Executive Onboarding Documents (${candidate.applicationNo})`,
        html: emailHtml,
      });
      emailDelivered = emailResult.success;
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
          },
        });
      } catch (e) {
        console.error('Database update error in documents send:', e);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, 'DOCUMENTS_SENT_TO_CANDIDATE', id, `Sent to: ${candidate.email} | Status: ${emailDelivered ? 'SENT' : 'FAILED'}`, ip);

    if (!emailDelivered) {
      return NextResponse.json({
        success: false,
        message: `Email sending failed — could not deliver onboarding documents to candidate email (${candidate.email}). Please check SMTP settings.`,
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
