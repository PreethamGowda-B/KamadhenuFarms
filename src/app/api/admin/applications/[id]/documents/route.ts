import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { getApplicationsStore } from '@/lib/store';
import { DocTypeKey, DocumentSnapshotData, generateDocumentHtml } from '@/lib/onboarding/templates';

const DOC_TITLES: Record<DocTypeKey, string> = {
  OFFER_LETTER: 'Offer & Sales Engagement Letter',
  AUTHORIZATION_LETTER: 'Sales Authorization Letter',
  COMMISSION_POLICY: 'Sales Commission Policy & Structure',
  PRICE_CATALOGUE: 'Product & Price Catalogue',
  SALES_GUIDELINES: 'Sales Reporting & Field Guidelines',
  CODE_OF_CONDUCT: 'Sales Executive Code of Conduct',
  COMPLETE_ONBOARDING_PACK: 'Complete Onboarding & Field Authorization Pack',
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = params;
    let documents: any[] = [];

    if (process.env.DATABASE_URL) {
      try {
        documents = await (prisma as any).onboardingDocument.findMany({
          where: { applicationId: id },
          orderBy: { createdAt: 'desc' },
        });
      } catch (e) {
        console.error('Prisma fetch documents error:', e);
      }
    }

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to fetch candidate documents.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin authentication required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { docType } = body as { docType: DocTypeKey };

    if (!docType || !DOC_TITLES[docType]) {
      return NextResponse.json({ success: false, message: 'Invalid or missing document type.' }, { status: 400 });
    }

    // Retrieve existing candidate application from DB / store
    let candidate: any = null;
    if (process.env.DATABASE_URL) {
      try {
        candidate = await (prisma as any).application.findUnique({ where: { id } });
      } catch (e) {}
    }
    if (!candidate) {
      const storeApps = getApplicationsStore();
      candidate = storeApps.find((a) => a.id === id);
    }

    if (!candidate) {
      return NextResponse.json({ success: false, message: 'Candidate application not found.' }, { status: 404 });
    }

    // Verify candidate is hired before generating official documents
    if (candidate.status !== 'HIRED' && candidate.status !== 'SELECTED') {
      return NextResponse.json({
        success: false,
        message: 'Official documents can only be generated after candidate is hired.',
      }, { status: 400 });
    }

    // Missing fields audit check
    const missingFields: string[] = [];
    if (!candidate.fullName) missingFields.push('Full Name');
    if (!candidate.mobileNumber) missingFields.push('Phone Number');
    if (!candidate.email) missingFields.push('Email');
    if (!candidate.city) missingFields.push('City / Address');
    if (!candidate.joiningDate) missingFields.push('Joining Date');
    if (!candidate.workingTerritory) missingFields.push('Working Territory');
    if (!candidate.reportingManager) missingFields.push('Reporting Manager');
    if (!candidate.engagementType) missingFields.push('Engagement Type');

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Cannot generate official document. Missing required candidate details.',
        missingFields,
      }, { status: 400 });
    }

    // Versioning logic: Find existing documents of this docType for this candidate
    let nextVersion = 1;
    if (process.env.DATABASE_URL) {
      try {
        const existing = await (prisma as any).onboardingDocument.findMany({
          where: { applicationId: id, docType },
          orderBy: { version: 'desc' },
        });
        if (existing.length > 0) {
          nextVersion = existing[0].version + 1;
        }
      } catch (e) {}
    }

    const docNoCode = docType.replace(/_/g, '').substring(0, 5);
    const documentNo = `DOC-${candidate.applicationNo}-${docNoCode}-V${nextVersion}`;
    const issueDate = new Date().toISOString().split('T')[0];

    const snapshotData: DocumentSnapshotData = {
      applicationId: candidate.id,
      applicationNo: candidate.applicationNo,
      fullName: candidate.fullName,
      mobileNumber: candidate.mobileNumber,
      email: candidate.email,
      address: candidate.city,
      city: candidate.city,
      state: candidate.state || 'Karnataka',
      pinCode: candidate.pinCode || '570001',
      joiningDate: candidate.joiningDate,
      workingTerritory: candidate.workingTerritory,
      commissionRate: candidate.commissionRate || '₹100/kg - ₹150/kg',
      commissionMin: candidate.commissionMin || 100,
      commissionMax: candidate.commissionMax || 150,
      payoutFrequency: candidate.payoutFrequency || 'Weekly',
      reportingManager: candidate.reportingManager,
      engagementType: candidate.engagementType || 'Sales Executive / Sales Partner',
      additionalTerms: candidate.additionalTerms || undefined,
      validFrom: candidate.authValidFrom || candidate.joiningDate,
      validUntil: candidate.authValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      documentNo,
      issueDate,
      version: nextVersion,
      isAuthActive: candidate.isAuthActive !== false,
    };

    const renderedHtml = generateDocumentHtml(docType, snapshotData);

    let createdDoc: any = null;
    if (process.env.DATABASE_URL) {
      try {
        createdDoc = await (prisma as any).onboardingDocument.create({
          data: {
            applicationId: id,
            docType,
            documentNo,
            title: DOC_TITLES[docType],
            version: nextVersion,
            status: 'DRAFT',
            validFrom: snapshotData.validFrom,
            validUntil: snapshotData.validUntil,
            contentSnapshot: JSON.stringify({ snapshotData, html: renderedHtml }),
            createdBy: session.email,
          },
        });

        // Update candidate onboarding status to DOCUMENTS_GENERATED
        await (prisma as any).application.update({
          where: { id },
          data: { onboardingStatus: 'DOCUMENTS_GENERATED' },
        });
      } catch (dbErr) {
        console.error('Prisma document creation error:', dbErr);
      }
    }

    if (!createdDoc) {
      createdDoc = {
        id: `doc_${Date.now()}`,
        applicationId: id,
        docType,
        documentNo,
        title: DOC_TITLES[docType],
        version: nextVersion,
        status: 'DRAFT',
        validFrom: snapshotData.validFrom,
        validUntil: snapshotData.validUntil,
        contentSnapshot: JSON.stringify({ snapshotData, html: renderedHtml }),
        createdBy: session.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Log Audit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, `GENERATE_DOCUMENT_${docType}_V${nextVersion}`, id, `DocNo: ${documentNo}`, ip);

    return NextResponse.json({
      success: true,
      data: createdDoc,
      renderedHtml,
      message: `${DOC_TITLES[docType]} generated successfully (v${nextVersion}.0).`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/documents error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error generating document.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { documentId, status } = body;

    if (!documentId || !status) {
      return NextResponse.json({ success: false, message: 'documentId and status are required.' }, { status: 400 });
    }

    let updatedDoc: any = null;
    if (process.env.DATABASE_URL) {
      try {
        updatedDoc = await (prisma as any).onboardingDocument.update({
          where: { id: documentId },
          data: {
            status,
            approvedBy: session.email,
            approvedAt: new Date(),
          },
        });

        // Update onboarding status
        if (status === 'APPROVED') {
          await (prisma as any).application.update({
            where: { id },
            data: { onboardingStatus: 'AWAITING_APPROVAL' },
          });
        }
      } catch (e) {
        console.error('Prisma document update status error:', e);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, `DOCUMENT_STATUS_CHANGE_${status}`, id, `Doc ID: ${documentId}`, ip);

    return NextResponse.json({
      success: true,
      data: updatedDoc,
      message: `Document status updated to ${status}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to update document status.' }, { status: 500 });
  }
}
