'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, TrendingUp, HeartHandshake } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 bg-gradient-to-b from-cream-bg via-cream-light to-cream-soft">
      {/* Background Subtle Honey Comb / Particle Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(#D8A64F_1px,transparent_1px)] [background-size:24px_24px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-gold-300 text-xs sm:text-sm font-medium text-gold-800 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-gold-600 animate-pulse" />
            <span>Join Kamadhenu Honey Farm • Sales Partner Network</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-charcoal tracking-tight leading-tight"
          >
            Become a <span className="gold-gradient-text">Sales Partner</span> & Build Your Income
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-charcoal-light leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Help us deliver 100% pure, natural, raw farm honey across Karnataka & India. Earn high commissions, enjoy flexible working hours, and grow with a trusted direct-from-farm brand.
          </motion.p>

          {/* Call to Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              href="/careers/apply"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 rounded-full shadow-gold-glow hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 group"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </Link>

            <Link
              href="#open-positions"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-charcoal bg-white border border-gold-300 rounded-full shadow-sm hover:bg-gold-50 hover:border-gold-400 hover:-translate-y-0.5 transition-all duration-300"
            >
              View Open Positions
            </Link>
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gold-300/40 max-w-2xl mx-auto text-left"
          >
            <div className="glass-panel p-4 rounded-2xl border border-gold-200">
              <div className="flex items-center gap-2 text-gold-600 font-bold text-xl sm:text-2xl">
                <TrendingUp className="w-5 h-5" /> ₹100/KG
              </div>
              <p className="text-xs text-gray-600 mt-1 font-medium">Direct Commission</p>
            </div>
            
            <div className="glass-panel p-4 rounded-2xl border border-gold-200">
              <div className="flex items-center gap-2 text-gold-600 font-bold text-xl sm:text-2xl">
                <HeartHandshake className="w-5 h-5" /> 100% Raw
              </div>
              <p className="text-xs text-gray-600 mt-1 font-medium">Pure Farm Guarantee</p>
            </div>

            <div className="col-span-2 sm:col-span-1 glass-panel p-4 rounded-2xl border border-gold-200">
              <div className="flex items-center gap-2 text-gold-600 font-bold text-xl sm:text-2xl">
                <ShieldCheck className="w-5 h-5" /> Weekly
              </div>
              <p className="text-xs text-gray-600 mt-1 font-medium">Punctual Payouts</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
