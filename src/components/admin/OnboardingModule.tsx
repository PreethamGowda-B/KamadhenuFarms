'use client';

import { useState, useEffect } from 'react';
import { 
  FileCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  Send, 
  Eye, 
  ShieldAlert, 
  UserCheck, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Building, 
  Printer, 
  X,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ApplicationRecord, OnboardingDocumentRecord, OnboardingStatusType } from '@/lib/store';
import { DocTypeKey, getVerificationUrl, calculateValidUntil } from '@/lib/onboarding/templates';
import { printDocumentHtml, downloadDocumentHtml } from '@/lib/onboarding/pdfGenerator';

interface Props {
  app: ApplicationRecord;
  onUpdate: (updatedApp: ApplicationRecord) => void;
}

const DOCUMENT_TYPES: { key: DocTypeKey; title: string; desc: string; icon: string }[] = [
  { key: 'OFFER_LETTER', title: '1. Offer & Sales Engagement Letter', desc: 'Official appointment, probation terms & compensation link.', icon: '📜' },
  { key: 'AUTHORIZATION_LETTER', title: '2. Sales Authorization Letter', desc: 'Retail store authorization with scannable QR code & validity dates.', icon: '🛡️' },
  { key: 'COMMISSION_POLICY', title: '3. Sales Commission Policy', desc: '₹100/kg - ₹150/kg tier rates, weekly payouts & paid order rules.', icon: '💵' },
  { key: 'PRICE_CATALOGUE', title: '4. Product & Price Catalogue', desc: 'Kamadhenu Raw Honey MRP, wholesale rates & packaging details.', icon: '🍯' },
  { key: 'SALES_GUIDELINES', title: '5. Sales Reporting Guidelines', desc: 'Daily 7 PM EOD sales reporting & store visit protocols.', icon: '📊' },
  { key: 'CODE_OF_CONDUCT', title: '6. Sales Executive Code of Conduct', desc: 'Strict compliance: no personal account collections, price rules.', icon: '⚖️' },
  { key: 'COMPLETE_ONBOARDING_PACK', title: '7. Complete Onboarding Pack', desc: 'Master combined PDF document set assembling all 6 documents.', icon: '📦' },
];

export default function OnboardingModule({ app, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    joiningDate: app.joiningDate || new Date().toISOString().split('T')[0],
    workingTerritory: app.workingTerritory || app.preferredSalesArea || app.city,
    commissionRate: app.commissionRate || '₹100/kg - ₹150/kg',
    commissionMin: app.commissionMin || 100,
    commissionMax: app.commissionMax || 150,
    payoutFrequency: app.payoutFrequency || 'Weekly on Mondays',
    reportingManager: app.reportingManager || 'Regional Sales Manager',
    engagementType: app.engagementType || 'Full-Time Sales Executive',
    additionalTerms: app.additionalTerms || '',
    authValidFrom: app.authValidFrom || app.joiningDate || new Date().toISOString().split('T')[0],
    authValidUntil: app.authValidUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [savingDetails, setSavingDetails] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [revokingAuth, setRevokingAuth] = useState(false);
  const [documents, setDocuments] = useState<OnboardingDocumentRecord[]>(app.onboardingDocuments || []);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; html: string; docNo: string } | null>(null);
  const [missingFieldsAlert, setMissingFieldsAlert] = useState<string[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, [app.id]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/documents`);
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  function printDocumentHtml(html: string, title: string) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups in your browser to print or save PDF.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: sans-serif; margin: 0; padding: 20px; color: #2d3748; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleConfirmHire = async () => {
    try {
      // 1. Mark status as HIRED permanently
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status: 'HIRED' }),
      });
      const json = await res.json();
      if (json.success) {
        // 2. Auto-save onboarding parameters with sensible defaults
        const defaultParams = {
          joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
          workingTerritory: formData.workingTerritory || app.city || 'Bangalore',
          engagementType: formData.engagementType || 'Sales Executive (Field Sales)',
          commissionRate: formData.commissionRate || '₹100/kg - ₹150/kg',
          commissionMin: formData.commissionMin || 100,
          commissionMax: formData.commissionMax || 150,
          payoutFrequency: formData.payoutFrequency || 'Weekly',
          additionalTerms: formData.additionalTerms || '',
          authValidFrom: formData.authValidFrom || formData.joiningDate || new Date().toISOString().split('T')[0],
          authValidUntil: formData.authValidUntil || calculateValidUntil(formData.authValidFrom || formData.joiningDate || new Date().toISOString().split('T')[0]),
        };

        const onboardingRes = await fetch(`/api/admin/applications/${app.id}/onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultParams),
        });

        const onboardingJson = await onboardingRes.json();
        const updatedCandidate = onboardingJson.success ? onboardingJson.data : { ...app, status: 'HIRED', onboardingStatus: 'DETAILS_PENDING' };
        onUpdate(updatedCandidate);

        // 3. Auto-generate key documents so offer letter & authorization are immediately ready
        const keyDocs: DocTypeKey[] = ['OFFER_LETTER', 'AUTHORIZATION_LETTER', 'COMMISSION_POLICY', 'PRICE_CATALOGUE'];
        for (const dType of keyDocs) {
          try {
            await fetch(`/api/admin/applications/${app.id}/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ docType: dType }),
            });
          } catch (e) {}
        }

        await fetchDocuments();
      }
    } catch (e) {
      alert('Failed to confirm hire');
    }
  };

  const handleSaveOnboardingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setSaveSuccessMsg(null);
    setMissingFieldsAlert([]);

    try {
      const res = await fetch(`/api/admin/applications/${app.id}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccessMsg(json.message);
        setMissingFieldsAlert(json.missingFields || []);
        onUpdate(json.data);
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert('Error saving onboarding details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleGenerateDocument = async (docType: DocTypeKey) => {
    setGeneratingDoc(docType);
    setMissingFieldsAlert([]);

    try {
      const res = await fetch(`/api/admin/applications/${app.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchDocuments();
        if (json.renderedHtml) {
          setPreviewDoc({
            title: DOCUMENT_TYPES.find((d) => d.key === docType)?.title || 'Document Preview',
            html: json.renderedHtml,
            docNo: json.data.documentNo,
          });
        }
      } else {
        if (json.missingFields) {
          setMissingFieldsAlert(json.missingFields);
        }
        alert(json.message);
      }
    } catch (e) {
      alert('Error generating document');
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, status: 'APPROVED' }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchDocuments();
      }
    } catch (e) {
      alert('Failed to approve document');
    }
  };

  const handleSendToCandidate = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/documents/send`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        onUpdate({ ...app, onboardingStatus: 'DOCUMENTS_SENT' });
        await fetchDocuments();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert('Error dispatching documents to candidate');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRevokeAuthorization = async () => {
    const confirmRevoke = window.confirm(
      `ARE YOU SURE YOU WANT TO REVOKE AUTHORIZATION for ${app.fullName}?\n\nThis will immediately mark field authorization as REVOKED on the public QR verification page.`
    );
    if (!confirmRevoke) return;

    setRevokingAuth(true);
    try {
      const res = await fetch(`/api/admin/applications/${app.id}/revoke-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Salesperson Exited / Revoked' }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        onUpdate({ ...app, isAuthActive: false, onboardingStatus: 'AUTHORIZATION_REVOKED', status: 'EXITED' });
      }
    } catch (e) {
      alert('Error revoking authorization');
    } finally {
      setRevokingAuth(false);
    }
  };

  const openDocPreview = (doc: OnboardingDocumentRecord) => {
    try {
      const parsed = JSON.parse(doc.contentSnapshot);
      setPreviewDoc({
        title: doc.title,
        html: parsed.html || parsed.contentHtml || '',
        docNo: doc.documentNo,
      });
    } catch (e) {
      alert('Unable to render document snapshot.');
    }
  };

  // If candidate is SELECTED but not yet HIRED, display the explicit Confirm Hire banner
  if (app.status === 'SELECTED') {
    return (
      <div className="glass-panel p-8 rounded-3xl border-2 border-emerald-400 bg-emerald-50/40 shadow-xl text-center space-y-4">
        <UserCheck className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-gray-900">Candidate Selected for Engagement</h2>
        <p className="text-xs text-gray-600 max-w-lg mx-auto">
          {app.fullName} is currently in <strong>SELECTED</strong> stage. Click below to confirm hire and activate the official Candidate Onboarding & Document Generation module.
        </p>
        <button
          onClick={handleConfirmHire}
          className="px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto"
        >
          <CheckCircle2 className="w-5 h-5" /> Confirm Hire & Start Onboarding
        </button>
      </div>
    );
  }

  // If status is not HIRED or EXITED, return null
  if (app.status !== 'HIRED' && app.status !== 'EXITED' && !app.onboardingStatus) {
    return null;
  }

  const isRevoked = app.isAuthActive === false || app.onboardingStatus === 'AUTHORIZATION_REVOKED';

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Module Banner & Workflow Timeline */}
      <div className="glass-panel p-6 rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-amber-700" />
              <h2 className="text-xl font-serif font-bold text-gray-900">Candidate Onboarding & Document Hub</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isRevoked
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {isRevoked ? 'REVOKED' : app.onboardingStatus || 'HIRED'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Automated Document Generation, Structured Commission (₹100-₹150/kg), Public QR Verification, and Code of Conduct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isRevoked ? (
              <button
                onClick={handleRevokeAuthorization}
                disabled={revokingAuth}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-md"
              >
                <ShieldAlert className="w-4 h-4" /> Revoke Field Authorization
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-rose-200 text-rose-900 font-bold text-xs rounded-xl border border-rose-400">
                Authorization Revoked
              </span>
            )}
          </div>
        </div>

        {/* Workflow Progress Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          {[
            { label: '1. Hired', active: true },
            { label: '2. Details Filled', active: !!app.joiningDate && !!app.workingTerritory },
            { label: '3. Docs Generated', active: documents.length > 0 },
            { label: '4. Approved', active: documents.some((d) => d.status === 'APPROVED' || d.status === 'SENT') },
            { label: '5. Sent to Candidate', active: app.onboardingStatus === 'DOCUMENTS_SENT' || app.onboardingStatus === 'ONBOARDING_COMPLETED' },
            { label: '6. Active Executive', active: !isRevoked && app.onboardingStatus === 'ONBOARDING_COMPLETED' },
          ].map((st, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl border font-semibold transition-all ${
                st.active
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white/70 text-gray-500 border-amber-200'
              }`}
            >
              {st.label}
            </div>
          ))}
        </div>

        {/* Section 18: Admin Communication Status Badges */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Hiring Email Status:</span>
            {app.hiringEmailStatus === 'SENT' ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-300 inline-flex items-center gap-1">
                ✓ Sent {app.hiringEmailSentAt ? `(${new Date(app.hiringEmailSentAt).toLocaleDateString('en-GB')})` : ''}
              </span>
            ) : app.hiringEmailStatus === 'FAILED' ? (
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full border border-rose-300 inline-flex items-center gap-1">
                ⚠ Delivery Failed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 font-medium rounded-full border border-gray-300">
                — Not Sent
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Onboarding Documents Status:</span>
            {app.onboardingStatus === 'DOCUMENTS_SENT' || documents.some((d) => d.status === 'SENT') ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-300 inline-flex items-center gap-1">
                ✓ Dispatched to Candidate ({app.email})
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-semibold rounded-full border border-amber-300">
                — Awaiting Approval & Dispatch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Missing Fields Alert Banner */}
      {missingFieldsAlert.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> Missing Required Candidate Onboarding Fields
          </div>
          <p>The following required fields must be saved before official documents can be generated:</p>
          <ul className="list-disc list-inside font-bold text-rose-800 pt-1">
            {missingFieldsAlert.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Onboarding Details Input Form */}
      <div className="glass-panel p-6 rounded-3xl border-2 border-amber-300 space-y-6">
        <div className="flex justify-between items-center border-b border-amber-200 pb-3">
          <h3 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-700" /> Onboarding Parameters & Field Terms
          </h3>
          <span className="text-xs text-amber-800 font-semibold bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            Retrieved Application ID: {app.applicationNo}
          </span>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold">
            {saveSuccessMsg}
          </div>
        )}

        <form onSubmit={handleSaveOnboardingDetails} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          
          <div>
            <label className="block font-bold text-gray-700 mb-1">Joining Date *</label>
            <input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => {
                const newJoining = e.target.value;
                const d = new Date(newJoining);
                if (!isNaN(d.getTime())) {
                  d.setMonth(d.getMonth() + 6);
                  d.setDate(d.getDate() - 1);
                  const newUntil = d.toISOString().split('T')[0];
                  setFormData({ ...formData, joiningDate: newJoining, authValidFrom: newJoining, authValidUntil: newUntil });
                } else {
                  setFormData({ ...formData, joiningDate: newJoining });
                }
              }}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Working Territory *</label>
            <input
              type="text"
              placeholder="e.g. Mandya & Mysore Retail Outlets"
              value={formData.workingTerritory}
              onChange={(e) => setFormData({ ...formData, workingTerritory: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Reporting Manager *</label>
            <input
              type="text"
              placeholder="e.g. Regional Sales Director"
              value={formData.reportingManager}
              onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Engagement Designation *</label>
            <select
              value={formData.engagementType}
              onChange={(e) => setFormData({ ...formData, engagementType: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500 font-bold text-amber-900"
            >
              <option value="Sales Executive (Field Sales)">Sales Executive (Field Sales)</option>
              <option value="Senior Sales Executive (Field Sales)">Senior Sales Executive (Field Sales)</option>
              <option value="Area Sales Executive">Area Sales Executive</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Commission Rate Structure</label>
            <input
              type="text"
              value={formData.commissionRate}
              onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500 font-semibold"
              placeholder="₹100/kg - ₹150/kg (Tiered)"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Payout Frequency</label>
            <select
              value={formData.payoutFrequency}
              onChange={(e) => setFormData({ ...formData, payoutFrequency: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="Weekly">Weekly (Every Monday)</option>
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Authorization Start Date *</label>
            <input
              type="date"
              value={formData.authValidFrom}
              onChange={(e) => {
                const newFrom = e.target.value;
                const d = new Date(newFrom);
                if (!isNaN(d.getTime())) {
                  d.setMonth(d.getMonth() + 6);
                  d.setDate(d.getDate() - 1);
                  const newUntil = d.toISOString().split('T')[0];
                  setFormData({ ...formData, authValidFrom: newFrom, authValidUntil: newUntil });
                } else {
                  setFormData({ ...formData, authValidFrom: newFrom });
                }
              }}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Authorization Expiry Date (6 Months) *</label>
            <input
              type="date"
              value={formData.authValidUntil}
              onChange={(e) => setFormData({ ...formData, authValidUntil: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Authorization Start Date</label>
            <input
              type="date"
              value={formData.authValidFrom}
              onChange={(e) => setFormData({ ...formData, authValidFrom: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Authorization Expiry Date</label>
            <input
              type="date"
              value={formData.authValidUntil}
              onChange={(e) => setFormData({ ...formData, authValidUntil: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-bold text-gray-700 mb-1">Additional Custom Engagement Terms</label>
            <textarea
              rows={2}
              placeholder="Special target quotas, retail incentive clauses, or customized agreement terms..."
              value={formData.additionalTerms}
              onChange={(e) => setFormData({ ...formData, additionalTerms: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-3 text-right pt-2">
            <button
              type="submit"
              disabled={savingDetails}
              className="px-6 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors shadow-md inline-flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" /> Save Onboarding Details & Terms
            </button>
          </div>
        </form>
      </div>

      {/* Document Generation Suite */}
      <div className="glass-panel p-6 rounded-3xl border-2 border-amber-300 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-200 pb-3">
          <div>
            <h3 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-700" /> Official Document Generation & Approval Suite
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click to generate, preview, approve, and send official branded documents with version history.
            </p>
          </div>

          <button
            onClick={handleSendToCandidate}
            disabled={sendingEmail || documents.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Send Complete Onboarding Pack to Candidate
          </button>
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENT_TYPES.map((docDef) => {
            const existingDocs = documents.filter((d) => d.docType === docDef.key);
            const latestDoc = existingDocs[0]; // Most recent version
            const isGenerating = generatingDoc === docDef.key;

            return (
              <div
                key={docDef.key}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">{docDef.icon}</span>
                    {latestDoc ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          latestDoc.status === 'APPROVED' || latestDoc.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        v{latestDoc.version}.0 ({latestDoc.status})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Not Generated
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm mt-2">{docDef.title}</h4>
                  <p className="text-[11px] text-gray-500 mt-1">{docDef.desc}</p>

                  {latestDoc && (
                    <p className="text-[10px] font-mono text-amber-800 mt-2 bg-amber-50 p-1.5 rounded border border-amber-200">
                      Ref: {latestDoc.documentNo}
                    </p>
                  )}
                </div>

                {/* Buttons Action Group */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateDocument(docDef.key)}
                      disabled={isGenerating}
                      className="flex-1 py-2 px-3 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      {latestDoc ? 'Regenerate' : 'Generate'}
                    </button>

                    {latestDoc && (
                      <button
                        onClick={() => openDocPreview(latestDoc)}
                        className="py-2 px-3 bg-gray-100 text-gray-800 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-1"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                    )}
                  </div>

                  {latestDoc && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const parsed = JSON.parse(latestDoc.contentSnapshot);
                          downloadDocumentHtml(parsed.html, latestDoc.documentNo);
                        }}
                        className="flex-1 py-1.5 px-2 bg-gray-50 text-gray-700 font-semibold text-[11px] rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download HTML
                      </button>

                      {latestDoc.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApproveDocument(latestDoc.id)}
                          className="py-1.5 px-3 bg-emerald-600 text-white font-bold text-[11px] rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Full-Screen Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border-2 border-amber-400 overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-300 flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-lg text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-700" /> {previewDoc.title}
                </h4>
                <p className="text-xs font-mono text-amber-800 font-bold">Doc Ref: {previewDoc.docNo}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printDocumentHtml(previewDoc.html, previewDoc.title)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-full hover:bg-amber-200 text-gray-700 transition-colors font-bold text-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Document Visual Renderer */}
            <div className="p-8 overflow-auto flex-1 bg-gray-50 flex justify-center">
              <div 
                className="w-full bg-white shadow-xl p-8 border border-gray-200 rounded-xl"
                dangerouslySetInnerHTML={{ __html: previewDoc.html }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center text-xs text-gray-600">
              <span>Official Document generated for {app.fullName} ({app.applicationNo})</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
