import { prisma } from '@/lib/prisma';
import { getApplicationsStore } from '@/lib/store';
import { ShieldCheck, ShieldAlert, Award, Calendar, MapPin, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  params: {
    salesId: string;
  };
}

export const revalidate = 0;

export default async function VerificationPage({ params }: Props) {
  const { salesId } = params;
  const normalizedId = salesId.toUpperCase().trim();

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
      console.error('Prisma verify query error:', e);
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

  const isValid = candidate && candidate.isAuthActive !== false && candidate.status === 'HIRED';

  return (
    <div className="min-h-screen bg-amber-50/40 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden">
        
        {/* Company Header Banner */}
        <div className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 p-6 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white text-amber-800 font-serif font-bold text-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
            KHF
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-wide">KAMADHENU HONEY FARMS</h1>
          <p className="text-xs uppercase tracking-widest text-amber-200 mt-1 font-semibold">
            Official Sales Executive Field Verification System
          </p>
        </div>

        {/* Verification Status Card */}
        <div className="p-8 space-y-6">
          {candidate ? (
            <>
              {/* Status Badge */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 text-center ${
                  isValid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {isValid ? (
                  <>
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    <div>
                      <h2 className="text-lg font-bold">VERIFIED AUTHORIZED REPRESENTATIVE</h2>
                      <p className="text-xs text-emerald-700 font-medium">
                        This individual is actively authorized to represent Kamadhenu Honey Farms.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
                    <div>
                      <h2 className="text-lg font-bold">AUTHORIZATION REVOKED / INVALID</h2>
                      <p className="text-xs text-rose-700 font-medium">
                        This sales authorization is no longer valid. Do not execute transactions under this ID.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Public Details Box (Strict Privacy Protection) */}
              <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-200 space-y-4">
                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <span className="text-xs font-semibold text-gray-500">Sales Executive Name</span>
                  <span className="text-base font-bold text-gray-900">{candidate.fullName}</span>
                </div>

                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <span className="text-xs font-semibold text-gray-500">Sales ID Number</span>
                  <span className="text-sm font-mono font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {candidate.applicationNo}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <span className="text-xs font-semibold text-gray-500">Designated Territory</span>
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    {candidate.workingTerritory || candidate.preferredSalesArea || candidate.city}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <span className="text-xs font-semibold text-gray-500">Designated Position</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {candidate.engagementType || 'Sales Executive (Field Sales)'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500">Authorization Valid Until</span>
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    {candidate.authValidUntil || 'Valid for 6 Months'}
                  </span>
                </div>
              </div>

              {/* Approved Documents Suite */}
              <div className="bg-amber-100/60 rounded-2xl p-5 border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" /> Official Onboarding & Authorization Documents
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-800 text-white px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  View or print high-resolution official PDF documents for candidate appointment and field authorization:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={`/verify/${candidate.applicationNo}/document/COMPLETE_ONBOARDING_PACK?print=true`}
                    target="_blank"
                    className="col-span-1 sm:col-span-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white p-3 rounded-xl text-xs font-bold text-center shadow flex items-center justify-center gap-2 transition-all"
                  >
                    <span>📦</span> Complete Master Onboarding Pack (PDF / Print View)
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/OFFER_LETTER?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>📜</span> Offer & Sales Engagement Letter
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/AUTHORIZATION_LETTER?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>🛡️</span> Official Sales Authorization Letter
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/COMMISSION_POLICY?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>💵</span> Sales Commission Policy (₹100-₹150/kg)
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/PRICE_CATALOGUE?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>🍯</span> Product & Price Catalogue
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/SALES_GUIDELINES?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>📊</span> Sales Reporting & Field Guidelines
                  </a>

                  <a
                    href={`/verify/${candidate.applicationNo}/document/CODE_OF_CONDUCT?print=true`}
                    target="_blank"
                    className="bg-white hover:bg-amber-50 text-gray-800 border border-amber-300 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <span>⚖️</span> Sales Executive Code of Conduct
                  </a>
                </div>
              </div>

              {/* Security Warning Notice */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-[11px] text-gray-600 space-y-1">
                <p className="font-bold text-gray-700">Official Notice to Retailers & Distributors:</p>
                <p>
                  Payments for products must strictly be deposited directly to official Kamadhenu Honey Farms bank/UPI accounts. Sales executives are not authorized to collect funds into personal bank accounts.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-4">
              <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900">Sales ID Not Found</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No active sales executive authorization found for ID: <span className="font-mono font-bold">{salesId}</span>. Please verify the ID code or contact Kamadhenu Honey Farms support.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 text-center text-xs text-gray-500 space-y-0.5">
          <p className="font-semibold text-gray-700">Kamadhenu Honey Farms — Official Apiary Products & Retail Distribution</p>
          <p>Farm Addr: Cholanayakanahalli, Magadi Main Road, Thavarekere, Bangalore Urban - 562130</p>
          <p>Email: kamadhenuhoneyfarms@gmail.com | Phone: +91 9980114675 / +91 9535134351</p>
        </div>

      </div>
    </div>
  );
}
