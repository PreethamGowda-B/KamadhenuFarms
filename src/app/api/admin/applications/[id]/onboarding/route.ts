import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { getApplicationsStore } from '@/lib/store';
import { DocTypeKey, DocumentSnapshotData, generateDocumentHtml, calculateValidUntil } from '@/lib/onboarding/templates';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admin authentication required.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const {
      joiningDate,
      workingTerritory,
      commissionRate,
      commissionMin,
      commissionMax,
      payoutFrequency,
      reportingManager,
      engagementType,
      additionalTerms,
      authValidFrom,
      authValidUntil,
    } = body;

    // Retrieve candidate application data from DB / store
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
      return NextResponse.json({ success: false, message: 'Candidate application record not found.' }, { status: 404 });
    }

    // Validate missing fields
    const missingFields: string[] = [];
    if (!joiningDate) missingFields.push('Joining Date');
    if (!workingTerritory) missingFields.push('Working Territory');
    if (!reportingManager) missingFields.push('Reporting Manager');
    if (!engagementType) missingFields.push('Engagement Type');

    const newOnboardingStatus = missingFields.length === 0 ? 'DETAILS_PENDING' : 'NOT_STARTED';

    const validFromDate = authValidFrom || joiningDate || new Date().toISOString().split('T')[0];
    const validUntilDate = authValidUntil || calculateValidUntil(validFromDate);

    const updatePayload = {
      joiningDate: joiningDate || null,
      workingTerritory: workingTerritory || null,
      commissionRate: commissionRate || '₹100/kg - ₹150/kg',
      commissionMin: commissionMin ? parseFloat(commissionMin) : 100,
      commissionMax: commissionMax ? parseFloat(commissionMax) : 150,
      payoutFrequency: payoutFrequency || 'Weekly',
      reportingManager: reportingManager || null,
      engagementType: engagementType || 'Sales Executive (Field Sales)',
      additionalTerms: additionalTerms || null,
      authValidFrom: validFromDate,
      authValidUntil: validUntilDate,
      onboardingStatus: newOnboardingStatus as any,
    };

    let updated: any = null;
    if (process.env.DATABASE_URL) {
      try {
        updated = await (prisma as any).application.update({
          where: { id },
          data: updatePayload,
          include: { onboardingDocuments: true },
        });

        // Re-generate or create new document versions for existing documents
        if (updated.onboardingDocuments && updated.onboardingDocuments.length > 0) {
          for (const doc of updated.onboardingDocuments) {
            const nextVersion = doc.status === 'APPROVED' || doc.status === 'SENT' ? doc.version + 1 : doc.version;
            const docNoCode = doc.docType.replace(/_/g, '').substring(0, 5);
            const documentNo = `DOC-${updated.applicationNo}-${docNoCode}-V${nextVersion}`;

            const snapshotData: DocumentSnapshotData = {
              applicationId: updated.id,
              applicationNo: updated.applicationNo,
              fullName: updated.fullName,
              mobileNumber: updated.mobileNumber,
              email: updated.email,
              address: updated.city,
              city: updated.city,
              state: updated.state || 'Karnataka',
              pinCode: updated.pinCode || '562130',
              joiningDate: updated.joiningDate || joiningDate,
              workingTerritory: updated.workingTerritory || workingTerritory,
              commissionRate: updated.commissionRate || '₹100/kg - ₹150/kg',
              commissionMin: updated.commissionMin || 100,
              commissionMax: updated.commissionMax || 150,
              payoutFrequency: updated.payoutFrequency || 'Weekly',
              reportingManager: updated.reportingManager || reportingManager,
              engagementType: updated.engagementType || 'Sales Executive (Field Sales)',
              additionalTerms: updated.additionalTerms || undefined,
              validFrom: updated.authValidFrom,
              validUntil: updated.authValidUntil,
              documentNo,
              issueDate: new Date().toISOString().split('T')[0],
              version: nextVersion,
              isAuthActive: updated.isAuthActive !== false,
            };

            const newHtml = generateDocumentHtml(doc.docType as DocTypeKey, snapshotData);

            if (doc.status === 'APPROVED' || doc.status === 'SENT') {
              // Preserve historical version and create new version
              await (prisma as any).onboardingDocument.create({
                data: {
                  applicationId: id,
                  docType: doc.docType,
                  documentNo,
                  title: doc.title,
                  version: nextVersion,
                  status: 'DRAFT',
                  validFrom: snapshotData.validFrom,
                  validUntil: snapshotData.validUntil,
                  contentSnapshot: JSON.stringify({ snapshotData, html: newHtml }),
                  createdBy: session.email,
                },
              });
            } else {
              // Update DRAFT version
              await (prisma as any).onboardingDocument.update({
                where: { id: doc.id },
                data: {
                  documentNo,
                  validFrom: snapshotData.validFrom,
                  validUntil: snapshotData.validUntil,
                  contentSnapshot: JSON.stringify({ snapshotData, html: newHtml }),
                },
              });
            }
          }

          // Refetch updated list with refreshed documents
          updated = await (prisma as any).application.findUnique({
            where: { id },
            include: { onboardingDocuments: true },
          });
        }
      } catch (dbErr) {
        console.error('Prisma update onboarding failed:', dbErr);
      }
    }

    if (!updated) {
      // Memory fallback update
      candidate = { ...candidate, ...updatePayload };
      updated = candidate;
    }

    // Log Audit
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    logAdminAction(session.email, 'UPDATE_ONBOARDING_DETAILS', id, JSON.stringify(updatePayload), ip);

    return NextResponse.json({
      success: true,
      data: updated,
      missingFields,
      message: missingFields.length === 0 ? 'Onboarding parameters saved successfully.' : `Details saved. Missing: ${missingFields.join(', ')}`,
    });
  } catch (error: any) {
    console.error('POST /api/admin/applications/[id]/onboarding error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error saving onboarding details.' }, { status: 500 });
  }
}
