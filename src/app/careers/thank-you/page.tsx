'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Home, ShoppingBag, PhoneCall, Sparkles } from 'lucide-react';

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const appNo = searchParams.get('appNo') || 'KHF-2026-005';
  const name = searchParams.get('name') || 'Applicant';

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D8A64F', '#B6852F', '#F3E7D0', '#2E2E2E'],
      });
    } catch (e) {
      // Ignore if canvas context is restricted
    }
  }, []);

  return (
    <div className="py-20 bg-cream-bg min-h-screen flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="glass-panel p-10 rounded-3xl border-2 border-gold-300 shadow-luxury space-y-6"
        >
          {/* Animated Success Checkmark */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Application Received
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
              Thank You, {name}!
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
              Our recruitment team has received your application and will contact you via phone/WhatsApp within 24-48 hours.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-gold-50 p-6 rounded-2xl border border-gold-300 max-w-md mx-auto text-left space-y-2">
            <p className="text-xs text-gray-500 font-medium">Your Unique Application ID:</p>
            <p className="text-2xl font-serif font-bold text-gold-700 tracking-wider">
              {appNo}
            </p>
            <p className="text-xs text-gray-600 pt-1 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-gold-600" /> Keep this ID ready for your screening interview.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/careers"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md hover:shadow-gold-500/30 transition-all"
            >
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Link>

            <a
              href="https://kamadhenuhoneyfarms.com/#products"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> View Products
            </a>
          </div>

        </motion.div>

      </div>
    </div>
  );
}
