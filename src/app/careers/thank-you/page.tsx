'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Home, ShoppingBag, Copy, Check, Search, Sparkles } from 'lucide-react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const appNo = searchParams.get('appNo') || 'KHF-2026-001';
  const name = searchParams.get('name') || 'Applicant';

  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D8A64F', '#B6852F', '#F3E7D0', '#2E2E2E'],
      });
    } catch (e) {}
  }, []);

  const handleCopyId = () => {
    if (copied) return;
    navigator.clipboard.writeText(appNo);
    setCopied(true);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="py-16 sm:py-20 bg-cream-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Application ID copied successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 text-center">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="glass-panel p-8 sm:p-12 rounded-3xl border-2 border-gold-300 shadow-luxury space-y-6"
        >
          {/* Animated Success Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Application Received
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
              Thank You, {name}!
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto">
              Our recruitment team has received your application. We will contact you via phone/WhatsApp within 24-48 hours.
            </p>
          </div>

          {/* Reference Card with Copy Action */}
          <div className="bg-gold-50/80 p-6 rounded-2xl border border-gold-300 max-w-md mx-auto text-left space-y-3 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Application ID</span>
              <button
                onClick={handleCopyId}
                disabled={copied}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white cursor-not-allowed'
                    : 'bg-gold-500 text-white hover:bg-gold-600 active:scale-95'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <p className="text-2xl sm:text-3xl font-mono font-bold text-gold-700 tracking-wider">
              {appNo}
            </p>
            
            <p className="text-[11px] text-gray-600 pt-1 border-t border-gold-200">
              Please copy and save this Application ID. You can use it anytime to track your application status.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/track?id=${appNo}`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-xs font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md hover:shadow-gold-500/30 transition-all"
            >
              <Search className="w-4 h-4 mr-2" /> Track Application Progress
            </Link>

            <Link
              href="/careers"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-xs font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" /> Back to Careers
            </Link>
          </div>

        </motion.div>

      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gold-600 font-semibold">Loading confirmation details...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
