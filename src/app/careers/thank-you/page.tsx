'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Home, Copy, Check, Search, Sparkles, MessageCircle, Send, ArrowRight } from 'lucide-react';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/FIkkmWXnCJS6O50Pc8Q4lY?s=cl&p=a&mlu=4';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const appNo = searchParams.get('appNo') || 'KHF-2026-001';
  const fullName = searchParams.get('name') || 'Applicant';
  const mobile = searchParams.get('mobile') || 'N/A';
  const position = searchParams.get('position') || 'Sales Partner';

  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hasJoinedGroup, setHasJoinedGroup] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D8A64F', '#B6852F', '#F3E7D0', '#2E2E2E', '#25D366'],
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

  const handleJoinWhatsApp = () => {
    setHasJoinedGroup(true);
    window.open(WHATSAPP_GROUP_LINK, '_blank', 'noopener,noreferrer');
  };

  const handleSendApplicationId = () => {
    const rawMessage = `Hello Kamadhenu Honey Farms Recruitment Team,

I have successfully submitted my application.

Application ID: ${appNo}
Name: ${fullName}
Mobile: ${mobile}
Applied Position: ${position}

I have joined the Kamadhenu Honey Farms WhatsApp Community. Kindly verify my application and provide further updates.

Thank you.`;

    const encodedText = encodeURIComponent(rawMessage);
    // wa.me / api.whatsapp.com handles both WhatsApp App on mobile and WhatsApp Web on Desktop
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="py-12 sm:py-16 bg-cream-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      
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
          className="glass-panel p-6 sm:p-10 rounded-3xl border-2 border-gold-300 shadow-luxury space-y-6"
        >
          {/* Animated Success Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Submission Confirmed
            </span>
            
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal leading-snug">
              Thank you for applying to Kamadhenu Honey Farms. Your application has been submitted successfully.
            </h1>
            
            <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto">
              Our recruitment team has safely logged your profile into our database. Please complete the WhatsApp verification below to fast-track your review.
            </p>
          </div>

          {/* Reference Card with Copy Action */}
          <div className="bg-gold-50/90 p-5 rounded-2xl border border-gold-300 max-w-md mx-auto text-left space-y-3 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Generated Application ID</span>
              <button
                type="button"
                onClick={handleCopyId}
                disabled={copied}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white cursor-not-allowed'
                    : 'bg-gold-500 text-white hover:bg-gold-600 active:scale-95'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            
            <p className="text-2xl sm:text-3xl font-mono font-bold text-gold-800 tracking-wider">
              {appNo}
            </p>
            
            <div className="pt-2 border-t border-gold-200/80 text-[11px] text-gray-600 flex flex-col gap-1">
              <div><span className="font-semibold text-charcoal">Applicant:</span> {fullName}</div>
              <div><span className="font-semibold text-charcoal">Mobile:</span> {mobile}</div>
              <div><span className="font-semibold text-charcoal">Position:</span> {position}</div>
            </div>
          </div>

          {/* WhatsApp Community Join Section */}
          <div className="bg-emerald-50/80 border-2 border-emerald-300/80 p-5 sm:p-6 rounded-2xl space-y-4 max-w-md mx-auto shadow-sm">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm">
              <MessageCircle className="w-5 h-5 text-emerald-600 fill-emerald-600" />
              <span>Step 2: Connect via WhatsApp</span>
            </div>

            {/* Main Join Button */}
            <button
              type="button"
              onClick={handleJoinWhatsApp}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>Join WhatsApp Community</span>
            </button>

            {/* Revealed Send Application ID Button after Join is clicked */}
            {hasJoinedGroup && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="pt-2 space-y-2"
              >
                <button
                  type="button"
                  onClick={handleSendApplicationId}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Application ID to Group</span>
                </button>
              </motion.div>
            )}

            {/* Instruction Message */}
            <p className="text-[11px] text-emerald-900 leading-relaxed pt-1 font-medium">
              After joining our WhatsApp Community, please click 'Send Application ID' and send your Application ID to the group. This helps us verify your application and keep you updated about recruitment.
            </p>
          </div>

          {/* Additional Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/track?id=${appNo}`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-xs font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md hover:shadow-gold-500/30 transition-all"
            >
              <Search className="w-4 h-4 mr-2" /> Track Application Status
            </Link>

            <Link
              href="/careers"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-xs font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" /> Back to Careers Home
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

