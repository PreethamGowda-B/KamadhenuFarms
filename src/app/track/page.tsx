'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  Video, 
  ExternalLink, 
  AlertCircle, 
  Sparkles,
  Award,
  RefreshCw,
  Home,
  User,
  Briefcase
} from 'lucide-react';
import TrackingTimeline from '@/components/careers/TrackingTimeline';

interface TrackingData {
  applicationNo: string;
  fullName: string;
  status: 'APPLIED' | 'REVIEWED' | 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'REJECTED';
  position: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewLink?: string;
  createdAt: string;
  updatedAt: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [inputAppId, setInputAppId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [appData, setAppData] = useState<TrackingData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialId) {
      executeSearch(initialId);
    }
  }, [initialId]);

  const executeSearch = async (queryId: string) => {
    const cleanId = queryId.trim();
    if (!cleanId) return;

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);
    setAppData(null);

    try {
      const res = await fetch(`/api/careers/track/${encodeURIComponent(cleanId)}`, {
        cache: 'no-store', // Disable caching for real-time Postgres synchronization
      });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setAppData(json.data);
      } else {
        setErrorMsg(json.message || 'Application not found');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to recruitment server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(inputAppId);
  };

  return (
    <div className="min-h-screen bg-cream-bg py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back to Careers Link */}
        <div>
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 hover:text-gold-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Careers Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-700 bg-gold-100 px-3.5 py-1 rounded-full border border-gold-300 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Candidate Tracking Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal tracking-tight">
            Track Your Application
          </h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Enter your Application ID to check your latest recruitment status in real-time.
          </p>
        </div>

        {/* Search Card Box */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-gold-300 shadow-luxury max-w-xl mx-auto">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
              Application Reference ID *
            </label>
            
            <div className="relative">
              <input
                type="text"
                value={inputAppId}
                onChange={(e) => setInputAppId(e.target.value)}
                placeholder="e.g. KHF-2026-001"
                className="w-full px-4 py-3.5 pl-11 text-sm font-mono font-semibold rounded-2xl border-2 border-gold-300 bg-white outline-none focus:border-gold-500 shadow-inner"
              />
              <Search className="w-5 h-5 text-gold-600 absolute left-3.5 top-3.5" />
            </div>

            <button
              type="submit"
              disabled={loading || !inputAppId.trim()}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-sm rounded-2xl hover:shadow-gold-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Searching PostgreSQL Database...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Track Application Status
                </>
              )}
            </button>
          </form>
        </div>

        {/* Dynamic Search Results & Status Display */}
        <AnimatePresence mode="wait">
          
          {/* 1. Loading Skeleton */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel p-8 rounded-3xl border border-gold-300 text-center space-y-4 max-w-2xl mx-auto"
            >
              <div className="w-12 h-12 rounded-full border-4 border-gold-500 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-gray-500">Fetching live record from database...</p>
            </motion.div>
          )}

          {/* 2. Not Found / Error State */}
          {!loading && searched && errorMsg && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-panel p-8 sm:p-10 rounded-3xl border-2 border-rose-300 text-center space-y-5 max-w-lg mx-auto bg-white/90 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-charcoal">Application Not Found</h3>
                <p className="text-xs text-gray-600">
                  The Application ID <span className="font-mono font-bold text-rose-700">{inputAppId}</span> does not exist in our database. Please verify the ID and try again.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/careers"
                  className="px-5 py-2.5 bg-charcoal text-white text-xs font-semibold rounded-xl hover:bg-charcoal-dark transition-colors inline-flex items-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" /> Return to Careers
                </Link>
              </div>
            </motion.div>
          )}

          {/* 3. Successful Candidate Status View */}
          {!loading && appData && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Application Summary Card */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-gold-300 shadow-luxury space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold-200 pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-gold-800 bg-gold-100 px-3 py-1 rounded-full border border-gold-300">
                      {appData.applicationNo}
                    </span>
                    <h2 className="text-2xl font-serif font-bold text-charcoal mt-2">{appData.fullName}</h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-gold-600" /> {appData.position}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-gray-400 block">Applied Date:</span>
                    <span className="text-xs font-semibold text-charcoal">{new Date(appData.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Animated Timeline */}
                <TrackingTimeline status={appData.status} />
              </div>

              {/* Status-Specific UI Cards */}
              <div className="space-y-4">
                
                {/* A. APPLIED or REVIEWED */}
                {(appData.status === 'APPLIED' || appData.status === 'REVIEWED') && (
                  <div className="glass-panel p-6 rounded-2xl border border-gold-300 bg-gold-50/50 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-gold-800 font-bold text-sm">
                      <Clock className="w-4 h-4 text-gold-600" /> Application Under Active Review
                    </div>
                    <p className="text-xs text-gray-700">
                      Your application is currently being reviewed by our recruitment team. Candidates shortlisted for the screening round will receive phone call and WhatsApp confirmation.
                    </p>
                  </div>
                )}

                {/* B. INTERVIEW SCHEDULED */}
                {appData.status === 'INTERVIEW_SCHEDULED' && (
                  <div className="glass-panel p-6 rounded-3xl border-2 border-amber-400 bg-amber-50/80 space-y-4 shadow-md">
                    <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-lg">
                      <Calendar className="w-5 h-5 text-amber-600" /> Interview Details Scheduled
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-gray-500 font-medium">Interview Date & Time:</span>
                        <p className="font-bold text-amber-950">{appData.interviewDate || 'To be confirmed'} at {appData.interviewTime || 'To be confirmed'}</p>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-gray-500 font-medium">Location / Mode:</span>
                        <p className="font-bold text-amber-950">{appData.interviewLocation || appData.interviewLink || 'Telephonic Interview Call'}</p>
                      </div>
                    </div>

                    {appData.interviewLink && (
                      <div className="pt-2">
                        <a
                          href={appData.interviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-5 py-3 bg-amber-600 text-white font-semibold text-xs rounded-xl hover:bg-amber-700 transition-colors shadow-md gap-2"
                        >
                          <Video className="w-4 h-4" /> Join Online Interview Meeting <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* C. SELECTED */}
                {appData.status === 'SELECTED' && (
                  <div className="glass-panel p-8 rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/80 space-y-4 shadow-xl text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                      <Award className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-serif font-bold text-emerald-950">🎉 Congratulations!</h3>
                      <p className="text-sm font-semibold text-emerald-800">
                        You have successfully cleared the recruitment process for Sales Partner.
                      </p>
                      <p className="text-xs text-emerald-700 max-w-md mx-auto pt-1">
                        Our HR team will contact you shortly via email and WhatsApp with your formal selection letter and onboarding next steps.
                      </p>
                    </div>
                  </div>
                )}

                {/* D. REJECTED */}
                {appData.status === 'REJECTED' && (
                  <div className="glass-panel p-6 rounded-2xl border border-rose-200 bg-rose-50/60 text-center space-y-2">
                    <p className="text-xs text-rose-800">
                      Thank you for your interest in Kamadhenu Honey Farms. Although you were not selected this time, we truly appreciate your application and encourage you to apply again in the future.
                    </p>
                  </div>
                )}

              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gold-600 font-semibold">Loading tracking portal...</div>}>
      <TrackContent />
    </Suspense>
  );
}
