'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Bike, 
  FileText, 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  MessageSquare, 
  ExternalLink,
  ShieldCheck,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { ApplicationRecord } from '@/lib/store';
import OnboardingModule from '@/components/admin/OnboardingModule';

const STAGES: { key: ApplicationRecord['status']; label: string }[] = [
  { key: 'APPLIED', label: '1. Applied' },
  { key: 'REVIEWED', label: '2. Reviewed' },
  { key: 'INTERVIEW_SCHEDULED', label: '3. Interview Scheduled' },
  { key: 'SELECTED', label: '4. Selected' },
  { key: 'HIRED', label: '5. Hired & Onboarded' },
  { key: 'REJECTED', label: '6. Rejected' },
];

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [app, setApp] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    fetchApp();
  }, [id]);

  const fetchApp = async () => {
    try {
      const res = await fetch('/api/admin/applications');
      const json = await res.json();
      if (json.success) {
        const found = json.data.find((a: ApplicationRecord) => a.id === id);
        if (found) setApp(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: ApplicationRecord['status']) => {
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note: newNote, author: 'Admin User' }),
      });
      const json = await res.json();
      if (json.success) {
        setApp(json.data);
        setNewNote('');
      }
    } catch (e) {
      alert('Failed to add note');
    }
  };

  const handleSendEmailNotification = async (type: 'interview' | 'select' | 'reject') => {
    setEmailSending(true);
    setEmailSuccess(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailSuccess(`Email notification (${type.toUpperCase()}) dispatched successfully to ${app?.email}`);
      }
    } catch (e) {
      alert('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-sm text-gray-500">Loading candidate details...</div>;
  if (!app) return <div className="p-12 text-center text-sm text-red-500">Application not found.</div>;

  const currentStageIndex = STAGES.findIndex((s) => s.key === app.status);

  return (
    <div className="min-h-screen bg-cream-bg py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <Link href="/admin/recruitment" className="text-xs font-semibold text-gold-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidate Table
        </Link>

        {/* Candidate Profile Header Card */}
        <div className="glass-panel p-8 rounded-3xl border-2 border-gold-300 shadow-luxury space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gold-500 text-white font-serif font-bold text-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                {app.profilePhotoUrl ? (
                  <img src={app.profilePhotoUrl} alt={app.fullName} className="w-full h-full object-cover" />
                ) : (
                  app.fullName.charAt(0)
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">{app.fullName}</h1>
                  <span className="font-mono text-xs font-bold text-gold-700 bg-gold-100 px-2.5 py-0.5 rounded-full border border-gold-300">
                    {app.applicationNo}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Applied on {new Date(app.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusUpdate('INTERVIEW_SCHEDULED')}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors"
              >
                Schedule Interview
              </button>
              <button
                onClick={() => handleStatusUpdate('SELECTED')}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Hire / Select Candidate
              </button>
              <button
                onClick={() => handleStatusUpdate('REJECTED')}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Reject Candidate
              </button>
            </div>
          </div>

          {/* Interactive Status Progression Timeline */}
          <div className="pt-4 border-t border-gold-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700 mb-3">Application Stage Progress</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STAGES.map((st, idx) => {
                const isCurrent = app.status === st.key;
                const isPassed = currentStageIndex >= idx && app.status !== 'REJECTED';
                return (
                  <button
                    key={st.key}
                    onClick={() => handleStatusUpdate(st.key)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-gold-500 text-white border-gold-600 shadow-md ring-2 ring-gold-200'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-gray-500 border-gold-200 hover:border-gold-400'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dispatch Email Notifications Section */}
        {emailSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            {emailSuccess}
          </div>
        )}

        <div className="glass-panel p-6 rounded-2xl border border-gold-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal">
            <Mail className="w-4 h-4 text-gold-600" /> Automated Candidate Email System:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSendEmailNotification('interview')}
              disabled={emailSending}
              className="px-3 py-1.5 bg-gold-100 text-gold-800 border border-gold-300 rounded-lg text-xs font-semibold hover:bg-gold-200 transition-colors"
            >
              Send Interview Email
            </button>
            <button
              onClick={() => handleSendEmailNotification('select')}
              disabled={emailSending}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition-colors"
            >
              Send Offer & Selection Email
            </button>
            <button
              onClick={() => handleSendEmailNotification('reject')}
              disabled={emailSending}
              className="px-3 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-200 transition-colors"
            >
              Send Rejection Email
            </button>
          </div>
        </div>

        {/* Candidate Onboarding & Official Document Suite */}
        <OnboardingModule app={app} onUpdate={setApp} />

        {/* Uploaded Documents & Verification Section */}
        <div className="glass-panel p-6 rounded-3xl border-2 border-gold-300 space-y-4">
          <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
            <FileText className="w-5 h-5 text-gold-600" /> Uploaded Candidate Documents & Verification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Resume File */}
            <div className="bg-white p-4 rounded-2xl border border-gold-200 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gold-600" /> Resume / CV
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Uploaded PDF / Word Resume</p>
              </div>
              {app.resumeUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingDoc({ title: 'Resume / CV', url: app.resumeUrl! })}
                  className="w-full py-2 px-3 bg-gold-500 text-white font-semibold text-xs rounded-xl hover:bg-gold-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View / Download Resume
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 italic bg-gray-50 p-2 rounded text-center">No resume uploaded</span>
              )}
            </div>

            {/* Aadhaar Document */}
            <div className="bg-white p-4 rounded-2xl border border-gold-200 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-gold-600" /> Aadhaar ID Proof
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Identity Verification Document</p>
              </div>
              {app.aadhaarUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingDoc({ title: 'Aadhaar ID Proof', url: app.aadhaarUrl! })}
                  className="w-full py-2 px-3 bg-gold-500 text-white font-semibold text-xs rounded-xl hover:bg-gold-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Aadhaar Document
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 italic bg-gray-50 p-2 rounded text-center">No Aadhaar uploaded</span>
              )}
            </div>

            {/* Profile Photo */}
            <div className="bg-white p-4 rounded-2xl border border-gold-200 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-gold-600" /> Candidate Photo
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Passport / Headshot Photo</p>
              </div>
              {app.profilePhotoUrl ? (
                <button
                  type="button"
                  onClick={() => setViewingDoc({ title: 'Candidate Photo', url: app.profilePhotoUrl! })}
                  className="w-full py-2 px-3 bg-gold-500 text-white font-semibold text-xs rounded-xl hover:bg-gold-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Profile Photo
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 italic bg-gray-50 p-2 rounded text-center">No photo uploaded</span>
              )}
            </div>

          </div>
        </div>

        {/* 2 Column Candidate Information Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Personal & Contact Details */}
          <div className="glass-panel p-6 rounded-3xl border border-gold-300 space-y-4">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <User className="w-5 h-5 text-gold-600" /> Personal & Contact Info
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Phone / WhatsApp:</span>
                <span className="font-bold text-charcoal">{app.mobileNumber} / {app.whatsAppNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Email:</span>
                <span className="font-bold text-charcoal">{app.email}</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Gender & Age:</span>
                <span className="font-bold text-charcoal">{app.gender.toUpperCase()}, {app.age} years</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">City, State & PIN:</span>
                <span className="font-bold text-charcoal">{app.city}, {app.state} ({app.pinCode})</span>
              </div>
            </div>
          </div>

          {/* Professional Details & Vehicle Status */}
          <div className="glass-panel p-6 rounded-3xl border border-gold-300 space-y-4">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <Bike className="w-5 h-5 text-gold-600" /> Sales Capabilities
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Bike & Driving License:</span>
                <span className="font-bold text-charcoal">
                  {app.hasBike ? '🛵 Bike Owned' : 'No Bike'}, {app.hasDrivingLicense ? 'License Active' : 'No License'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Sales Experience:</span>
                <span className="font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded">{app.salesExperience}</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Current Occupation:</span>
                <span className="font-bold text-charcoal">{app.currentOccupation}</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Languages Spoken:</span>
                <span className="font-bold text-charcoal">{app.languagesKnown.join(', ')}</span>
              </div>
              <div className="flex justify-between border-b border-gold-100 pb-2">
                <span className="text-gray-500">Preferred Sales Area:</span>
                <span className="font-bold text-charcoal">{app.preferredSalesArea}</span>
              </div>
            </div>
          </div>

          {/* Statement & Motivation */}
          <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-gold-300 space-y-3">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <FileText className="w-5 h-5 text-gold-600" /> Why They Want To Join Kamadhenu Honey
            </h3>
            <p className="text-sm text-gray-700 italic bg-gold-50/60 p-4 rounded-xl border border-gold-200">
              "{app.whyJoin}"
            </p>
          </div>

          {/* Internal Notes Section */}
          <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-gold-300 space-y-4">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <MessageSquare className="w-5 h-5 text-gold-600" /> Internal Hiring Notes ({(app.notes || []).length})
            </h3>

            <div className="space-y-3">
              {(app.notes || []).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No internal notes added yet.</p>
              ) : (
                (app.notes || []).map((note) => (
                  <div key={note.id} className="bg-white p-3.5 rounded-xl border border-gold-200 text-xs space-y-1">
                    <div className="flex justify-between text-gray-500 font-semibold">
                      <span>{note.author}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-charcoal">{note.content}</p>
                  </div>
                ))
              )}

              <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add an internal note or screening feedback..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold-500 text-white rounded-xl text-xs font-semibold hover:bg-gold-600 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Add Note
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Document / Photo Modal Popup */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border-2 border-gold-300 overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-cream-bg border-b border-gold-300 flex items-center justify-between">
              <h4 className="font-serif font-bold text-lg text-charcoal flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-600" /> {viewingDoc.title}
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href={viewingDoc.url}
                  download={`Candidate_${viewingDoc.title.replace(/\s+/g, '_')}`}
                  className="px-3 py-1.5 bg-gold-500 text-white rounded-xl text-xs font-semibold hover:bg-gold-600 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 rounded-full hover:bg-gold-200 text-charcoal transition-colors font-bold text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Media Render */}
            <div className="p-6 overflow-auto flex-1 flex items-center justify-center bg-cream-soft/50 min-h-[350px]">
              {viewingDoc.url.startsWith('data:image/') || viewingDoc.url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-gold-200"
                />
              ) : viewingDoc.url.startsWith('data:application/pdf') || viewingDoc.url.match(/\.pdf$/i) ? (
                <iframe
                  src={viewingDoc.url}
                  title={viewingDoc.title}
                  className="w-full h-[65vh] rounded-xl border border-gold-300 shadow-sm"
                />
              ) : (
                <div className="text-center space-y-4 py-8">
                  <p className="text-sm font-semibold text-charcoal">Document Preview</p>
                  <p className="text-xs text-gray-500 max-w-md">This document formatted file is ready for download or view.</p>
                  <a
                    href={viewingDoc.url}
                    download={`Candidate_${viewingDoc.title.replace(/\s+/g, '_')}`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-gold-700 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download / Save Document
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
