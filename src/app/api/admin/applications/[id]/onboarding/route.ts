import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { getApplicationsStore } from '@/lib/store';
import { DocTypeKey, DocumentSnapshotData, generateDocumentHtml } from '@/lib/onboarding/templates';

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

    const updatePayload = {
      joiningDate: joiningDate || null,
      workingTerritory: workingTerritory || null,
      commissionRate: commissionRate || '₹100/kg - ₹150/kg',
      commissionMin: commissionMin ? parseFloat(commissionMin) : 100,
      commissionMax: commissionMax ? parseFloat(commissionMax) : 150,
      payoutFrequency: payoutFrequency || 'Weekly',
      reportingManager: reportingManager || null,
      engagementType: engagementType || 'Sales Executive / Sales Partner',
      additionalTerms: additionalTerms || null,
      authValidFrom: authValidFrom || joiningDate || new Date().toISOString().split('T')[0],
      authValidUntil: authValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

        // Re-generate contentSnapshot for all existing documents with new Joining Date & params
        if (updated.onboardingDocuments && updated.onboardingDocuments.length > 0) {
          for (const doc of updated.onboardingDocuments) {
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
              engagementType: updated.engagementType || engagementType,
              additionalTerms: updated.additionalTerms || undefined,
              validFrom: updated.authValidFrom || updated.joiningDate,
              validUntil: updated.authValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              documentNo: doc.documentNo,
              issueDate: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              version: doc.version,
              isAuthActive: updated.isAuthActive !== false,
            };

            const newHtml = generateDocumentHtml(doc.docType as DocTypeKey, snapshotData);

            await (prisma as any).onboardingDocument.update({
              where: { id: doc.id },
              data: {
                validFrom: snapshotData.validFrom,
                validUntil: snapshotData.validUntil,
                contentSnapshot: JSON.stringify({ snapshotData, html: newHtml }),
              },
            });
          }

          // Refetch updated list with refreshed document snapshots
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
