import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { getApplicationsStore } from '@/lib/store';
import { 
  DocTypeKey, 
  DocumentSnapshotData, 
  generateDocumentHtml, 
  calculateValidUntil, 
  getVerificationUrl 
} from '@/lib/onboarding/templates';

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
    const validUntilStr = candidate.authValidUntil || calculateValidUntil(validFromStr);

    const docTypesList: { key: DocTypeKey; title: string; filename: string }[] = [
      { key: 'OFFER_LETTER', title: 'Offer & Sales Engagement Letter', filename: `1_Offer_Letter_${candidate.applicationNo}.html` },
      { key: 'AUTHORIZATION_LETTER', title: 'Official Sales Authorization Letter', filename: `2_Sales_Authorization_${candidate.applicationNo}.html` },
      { key: 'COMMISSION_POLICY', title: 'Sales Commission Policy & Structure', filename: `3_Commission_Policy_${candidate.applicationNo}.html` },
      { key: 'PRICE_CATALOGUE', title: 'Product & Price Catalogue', filename: `4_Product_Price_Catalogue_${candidate.applicationNo}.html` },
      { key: 'SALES_GUIDELINES', title: 'Sales Reporting & Field Guidelines', filename: `5_Sales_Reporting_Guidelines_${candidate.applicationNo}.html` },
      { key: 'CODE_OF_CONDUCT', title: 'Sales Executive Code of Conduct', filename: `6_Code_of_Conduct_${candidate.applicationNo}.html` },
      { key: 'COMPLETE_ONBOARDING_PACK', title: 'Complete Onboarding Pack (Combined Master Set)', filename: `7_Complete_Onboarding_Pack_${candidate.applicationNo}.html` },
    ];

    const snapshotData: DocumentSnapshotData = {
      applicationId: candidate.id,
      applicationNo: candidate.applicationNo,
      fullName: candidate.fullName,
      mobileNumber: candidate.mobileNumber,
      email: candidate.email,
      address: candidate.city,
      city: candidate.city,
      state: candidate.state || 'Karnataka',
      pinCode: candidate.pinCode || '562130',
      joiningDate: candidate.joiningDate || validFromStr,
      workingTerritory: candidate.workingTerritory || candidate.preferredSalesArea || candidate.city || 'Bangalore',
      commissionRate: candidate.commissionRate || '₹100/kg - ₹150/kg',
      commissionMin: candidate.commissionMin || 100,
      commissionMax: candidate.commissionMax || 150,
      payoutFrequency: candidate.payoutFrequency || 'Weekly (Every Monday)',
      reportingManager: candidate.reportingManager || 'Regional Sales Manager',
      engagementType: candidate.engagementType || 'Sales Executive (Field Sales)',
      additionalTerms: candidate.additionalTerms || undefined,
      validFrom: validFromStr,
      validUntil: validUntilStr,
      documentNo: `DOC-${candidate.applicationNo}-PACK-V1`,
      issueDate: new Date().toISOString().split('T')[0],
      version: 1,
      isAuthActive: candidate.isAuthActive !== false,
    };

    const emailAttachments: Array<{ filename: string; content: string; contentType: string }> = [];

    // Ensure all 7 documents are generated & approved
    for (const d of docTypesList) {
      let docHtml = '';
      if (process.env.DATABASE_URL) {
        try {
          const existing = await (prisma as any).onboardingDocument.findFirst({
            where: { applicationId: id, docType: d.key },
            orderBy: { version: 'desc' },
          });

          if (existing) {
            try {
              const parsed = JSON.parse(existing.contentSnapshot);
              docHtml = parsed.html || parsed.contentHtml || '';
            } catch (pErr) {}
            
            // Mark existing draft document as APPROVED & SENT
            await (prisma as any).onboardingDocument.update({
              where: { id: existing.id },
              data: { status: 'SENT', sentAt: new Date() },
            });
          }

          if (!docHtml) {
            const documentNo = `DOC-${candidate.applicationNo}-${d.key.replace(/_/g, '').substring(0, 5)}-V1`;
            const dSnapshot = { ...snapshotData, documentNo };
            docHtml = generateDocumentHtml(d.key, dSnapshot);

            await (prisma as any).onboardingDocument.create({
              data: {
                applicationId: id,
                docType: d.key,
                documentNo,
                title: d.title,
                version: 1,
                status: 'SENT',
                validFrom: validFromStr,
                validUntil: validUntilStr,
                contentSnapshot: JSON.stringify({ snapshotData: dSnapshot, html: docHtml }),
                createdBy: session.email,
                approvedBy: session.email,
                approvedAt: new Date(),
                sentAt: new Date(),
              },
            });
          }
        } catch (e) {
          console.error(`Error processing docType ${d.key}:`, e);
        }
      }

      if (!docHtml) {
        docHtml = generateDocumentHtml(d.key, snapshotData);
      }

      emailAttachments.push({
        filename: d.filename,
        content: docHtml,
        contentType: 'text/html',
      });
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8F5EF; padding: 30px; color: #2E2E2E;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 35px; border: 1.5px solid #D8A64F; box-shadow: 0 12px 35px rgba(182, 133, 47, 0.15);">
          
          <!-- Header Banner -->
          <div style="text-align: center; margin-bottom: 25px; background: linear-gradient(135deg, #FAF6EE 0%, #FFFDF9 100%); padding: 22px; border-radius: 14px; border: 1px solid #F3E2B6;">
            <h1 style="color: #B6852F; margin: 0; font-size: 28px; font-family: Georgia, serif;">🍯 KAMADHENU HONEY FARMS</h1>
            <p style="color: #6A471A; font-size: 13px; margin-top: 6px; font-weight: 600; letter-spacing: 0.5px;">Official Candidate Onboarding & Field Authorization Pack</p>
          </div>

          <h2 style="color: #2E2E2E; font-size: 22px; font-family: Georgia, serif; text-align: center; margin: 20px 0 10px 0;">Official Field Authorization & Documents Issued 🎉</h2>

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

          <!-- Attachments Banner -->
          <div style="background-color: #ECFDF5; border-left: 5px solid #10B981; padding: 18px 20px; margin: 25px 0; border-radius: 10px; border: 1px solid #A7F3D0;">
            <h4 style="margin: 0 0 8px 0; color: #065F46; font-size: 15px; font-family: Georgia, serif;">📎 7 Official Onboarding Documents Attached Below</h4>
            <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.6;">
              All 6 official onboarding letters, policy documents, and your Master Combined Onboarding Pack are attached directly to this email as downloadable files. You can open and save each document for your official records.
            </p>
          </div>

          <!-- Included Approved Document List -->
          <div style="background: #FAF8F5; padding: 22px; border-radius: 12px; border: 1px solid #F0E6D2; margin: 25px 0;">
            <h4 style="color: #B6852F; font-size: 15px; margin: 0 0 12px 0; font-family: Georgia, serif;">Official Document Set Attached (7 Files):</h4>
            <ol style="line-height: 1.9; color: #4A4A4A; padding-left: 20px; margin: 0; font-size: 13px;">
              <li>📜 <strong>1. Offer & Sales Engagement Letter</strong> (<code>1_Offer_Letter_${candidate.applicationNo}.html</code>)</li>
              <li>🛡️ <strong>2. Official Sales Authorization Letter</strong> with Scannable QR Code (<code>2_Sales_Authorization_${candidate.applicationNo}.html</code>)</li>
              <li>💵 <strong>3. Sales Commission Policy & Structure</strong> (<code>3_Commission_Policy_${candidate.applicationNo}.html</code>)</li>
              <li>🍯 <strong>4. Product & Price Catalogue</strong> (<code>4_Product_Price_Catalogue_${candidate.applicationNo}.html</code>)</li>
              <li>📊 <strong>5. Sales Reporting Guidelines</strong> (<code>5_Sales_Reporting_Guidelines_${candidate.applicationNo}.html</code>)</li>
              <li>⚖️ <strong>6. Code of Conduct & Compliance</strong> (<code>6_Code_of_Conduct_${candidate.applicationNo}.html</code>)</li>
              <li>📦 <strong>7. Complete Master Onboarding Pack</strong> (<code>7_Complete_Onboarding_Pack_${candidate.applicationNo}.html</code>)</li>
            </ol>
          </div>

          <!-- Live QR Verification Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #D8A64F 0%, #B6852F 100%); color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 15px; box-shadow: 0 6px 20px rgba(182, 133, 47, 0.35);">
              View Digital Authorization & Live QR Verification Seal 🛡️
            </a>
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
    try {
      const sendRes = await sendEmail({
        to: candidate.email,
        subject: `Kamadhenu Honey Farms — Sales Executive Onboarding Documents (${candidate.applicationNo})`,
        html: emailHtml,
        attachments: emailAttachments,
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
      } catch (e) {
        console.error('Database update error in documents send:', e);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, 'DOCUMENTS_SENT_TO_CANDIDATE', id, `Sent 7 attachments to: ${candidate.email} | Status: ${emailDelivered ? 'SENT' : 'FAILED'}`, ip);

    if (!emailDelivered) {
      return NextResponse.json({
        success: false,
        message: `Email sending failed — could not deliver onboarding document attachments to candidate email (${candidate.email}). Please check SMTP settings.`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `All 7 onboarding documents successfully generated, approved, and dispatched as attachments to candidate email (${candidate.email}).`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/documents/send error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send documents to candidate.' }, { status: 500 });
  }
}
