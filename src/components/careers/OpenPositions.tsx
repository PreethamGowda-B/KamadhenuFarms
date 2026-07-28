'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, DollarSign, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function OpenPositions() {
  return (
    <section id="open-positions" className="py-20 bg-cream-light relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
            Open Opportunities
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Current Open Positions
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Select an active position below to review the responsibilities and submit your application.
          </p>
        </div>

        {/* Position Card */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-panel p-8 sm:p-10 rounded-3xl border-2 border-gold-400 shadow-luxury hover:shadow-card-hover transition-all duration-300 relative overflow-hidden"
          >
            {/* Top Hiring Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-gold-600 to-gold-500 text-white text-xs font-bold px-6 py-1.5 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> Hiring Now
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">
                    Sales Agent (Field & Retail)
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active Hiring
                  </span>
                </div>

                <p className="text-sm text-gray-600 max-w-xl leading-relaxed">
                  Promote and sell Kamadhenu 100% Pure Raw Honey to households, apartment complexes, retail stores, and organic shops across your district in Karnataka.
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap gap-4 text-xs font-medium text-charcoal-light pt-2">
                  <div className="flex items-center gap-1.5 bg-gold-100/70 text-gold-900 px-3 py-1.5 rounded-lg border border-gold-200">
                    <MapPin className="w-4 h-4 text-gold-600" /> Karnataka (All Districts)
                  </div>
                  <div className="flex items-center gap-1.5 bg-gold-100/70 text-gold-900 px-3 py-1.5 rounded-lg border border-gold-200">
                    <Briefcase className="w-4 h-4 text-gold-600" /> Commission Based
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> ₹100–₹150 per KG Commission (20%–25%)
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 pt-4 md:pt-0">
                <Link
                  href="/careers/apply"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md hover:shadow-gold-500/30 hover:scale-[1.02] transition-all"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  href="/careers/sales-agent"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
                >
                  View Details & Earnings
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
