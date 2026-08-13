import { prisma } from '@/lib/prisma';
import { getApplicationsStore } from '@/lib/store';
import { 
  DocTypeKey, 
  DocumentSnapshotData, 
  generateDocumentHtml, 
  calculateValidUntil, 
  getVerificationUrl 
} from '@/lib/onboarding/templates';
import DocumentViewerClient from './DocumentViewerClient';

interface Props {
  params: {
    salesId: string;
    docType: string;
  };
}

export const revalidate = 0;

const DOC_TITLES: Record<string, string> = {
  OFFER_LETTER: 'Offer & Sales Engagement Letter',
  AUTHORIZATION_LETTER: 'Official Sales Authorization Letter',
  COMMISSION_POLICY: 'Sales Commission Policy & Structure',
  PRICE_CATALOGUE: 'Product & Price Catalogue',
  SALES_GUIDELINES: 'Sales Reporting & Field Guidelines',
  CODE_OF_CONDUCT: 'Sales Executive Code of Conduct',
  COMPLETE_ONBOARDING_PACK: 'Complete Candidate Onboarding & Field Authorization Pack',
};

export default async function DocumentViewPage({ params }: Props) {
  const { salesId, docType } = params;
  const normalizedId = salesId.toUpperCase().trim();
  const validDocType = (DOC_TITLES[docType] ? docType : 'COMPLETE_ONBOARDING_PACK') as DocTypeKey;

  let candidate: any = null;

  if (process.env.DATABASE_URL) {
    try {
      candidate = await prisma.application.findFirst({
        where: {
          OR: [
            { applicationNo: { equals: normalizedId, mode: 'insensitive' } },
            { id: normalizedId },
          ],
        },
      });
    } catch (e) {
      console.error('Prisma candidate document view query error:', e);
    }
  }

  if (!candidate) {
    const storeApps = getApplicationsStore();
    candidate = storeApps.find(
      (a) =>
        a.applicationNo.toUpperCase() === normalizedId ||
        a.id.toUpperCase() === normalizedId ||
        a.applicationNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === normalizedId.replace(/[^a-zA-Z0-9]/g, '')
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-white p-8 rounded-2xl border-2 border-rose-300 shadow-xl">
          <h1 className="text-xl font-bold text-rose-800">Candidate Record Not Found</h1>
          <p className="text-sm text-gray-600 mt-2">
            No record found for ID: <span className="font-mono font-bold">{salesId}</span>.
          </p>
        </div>
      </div>
    );
  }

  const validFromDate = candidate.authValidFrom || candidate.joiningDate || new Date().toISOString().split('T')[0];
  const validUntilDate = candidate.authValidUntil || calculateValidUntil(validFromDate);

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
    joiningDate: candidate.joiningDate || validFromDate,
    workingTerritory: candidate.workingTerritory || candidate.preferredSalesArea || candidate.city || 'Bangalore',
    commissionRate: candidate.commissionRate || '₹100/kg - ₹150/kg',
    commissionMin: candidate.commissionMin || 100,
    commissionMax: candidate.commissionMax || 150,
    payoutFrequency: candidate.payoutFrequency || 'Weekly (Every Monday)',
    reportingManager: candidate.reportingManager || 'Regional Sales Manager',
    engagementType: candidate.engagementType || 'Sales Executive (Field Sales)',
    additionalTerms: candidate.additionalTerms || undefined,
    validFrom: validFromDate,
    validUntil: validUntilDate,
    documentNo: `DOC-${candidate.applicationNo}-${validDocType.substring(0, 5)}-V1`,
    issueDate: new Date().toISOString().split('T')[0],
    version: 1,
    isAuthActive: candidate.isAuthActive !== false,
  };

  const renderedHtml = generateDocumentHtml(validDocType, snapshotData);
  const docTitle = DOC_TITLES[validDocType] || 'Official Document';

  return (
    <DocumentViewerClient 
      htmlContent={renderedHtml}
      docTitle={docTitle}
      candidateName={candidate.fullName}
      applicationNo={candidate.applicationNo}
      verificationUrl={`/verify/${candidate.applicationNo}`}
    />
  );
}
