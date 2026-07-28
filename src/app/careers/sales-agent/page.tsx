'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, DollarSign, CheckCircle2, ArrowRight, Calculator, Award, Sparkles } from 'lucide-react';

export default function JobDetailsPage() {
  const [salesKg, setSalesKg] = useState<number>(100);

  // Updated commission structure: ₹100–₹150 per KG (avg ₹125/kg for 20%–25% margin)
  const baseCommission = salesKg * 125;
  let bonus = 0;
  if (salesKg >= 200) bonus = 5000;
  else if (salesKg >= 100) bonus = 2000;
  else if (salesKg >= 50) bonus = 500;

  const totalEarnings = baseCommission + bonus;

  return (
    <div className="py-12 bg-cream-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <Link href="/careers" className="text-xs font-semibold text-gold-600 hover:underline inline-flex items-center gap-1">
            ← Back to Careers
          </Link>
        </div>

        {/* Job Title Card */}
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border-2 border-gold-300 shadow-luxury mb-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gold-600">
                Direct Farm Sales Partner
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal mt-1">
                Sales Agent (Karnataka Region)
              </h1>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Hiring Status: Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-gold-50/70 p-3.5 rounded-xl border border-gold-200 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gold-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Location</p>
                <p className="text-sm font-semibold text-charcoal">Karnataka (All Districts)</p>
              </div>
            </div>

            <div className="bg-gold-50/70 p-3.5 rounded-xl border border-gold-200 flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-gold-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Employment Type</p>
                <p className="text-sm font-semibold text-charcoal">Commission Based</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-emerald-700 font-medium">Commission Rate</p>
                <p className="text-sm font-bold text-emerald-900">₹100–₹150 per KG (20%–25%)</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gold-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              ⚡ Weekly Monday payouts direct to Bank account or UPI. Higher sales performance unlocks higher commission within range.
            </p>
            <Link
              href="/careers/apply"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-gold-glow hover:shadow-card-hover transition-all"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>

        {/* Expected Earnings Calculator */}
        <div className="glass-panel-dark p-8 rounded-3xl mb-12 shadow-2xl border border-gold-400">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-charcoal-dark flex items-center justify-center font-bold">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-gold-400">
                Interactive Earnings Calculator
              </h2>
              <p className="text-xs text-gray-300">
                Adjust monthly honey sales volume to see expected partner income (calculated at ₹100–₹150/KG range).
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2 text-sm font-semibold">
                <span className="text-gray-200">Estimated Monthly Sales (KG):</span>
                <span className="text-gold-400 font-bold text-lg">{salesKg} KG / Month</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={salesKg}
                onChange={(e) => setSalesKg(Number(e.target.value))}
                className="w-full h-3 bg-gold-900 rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>10 KG (Part-time)</span>
                <span>100 KG (Standard)</span>
                <span>250 KG (Pro Seller)</span>
                <span>500 KG (Distributor)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gold-800">
              <div className="bg-charcoal p-4 rounded-xl border border-gold-900">
                <p className="text-xs text-gray-400">Base Commission (₹100–₹150/kg)</p>
                <p className="text-xl font-bold text-white mt-1">₹{baseCommission.toLocaleString()}</p>
              </div>

              <div className="bg-charcoal p-4 rounded-xl border border-gold-900">
                <p className="text-xs text-gold-400 font-semibold">Volume Performance Bonus</p>
                <p className="text-xl font-bold text-gold-400 mt-1">+ ₹{bonus.toLocaleString()}</p>
              </div>

              <div className="bg-gold-500/20 p-4 rounded-xl border border-gold-500 text-gold-300">
                <p className="text-xs font-bold uppercase tracking-wider text-gold-400 font-serif">Total Monthly Earnings</p>
                <p className="text-2xl font-serif font-extrabold text-gold-400 mt-1">
                  ₹{totalEarnings.toLocaleString()} <span className="text-xs text-gray-300 font-normal">/ mo</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Column Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Responsibilities */}
          <div className="glass-panel p-8 rounded-3xl border border-gold-300/60">
            <h3 className="text-xl font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-600" /> Key Responsibilities & Benefits
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Earn ₹100–₹150 commission for every kilogram of honey sold.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Earn 20%–25% commission margin on every successful customer sale.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Higher sales performance can unlock higher commission within this range.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Unlimited earning potential based on sales performance.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Weekly/Monthly payout as configured by the company direct to your bank or UPI.</span>
              </li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="glass-panel p-8 rounded-3xl border border-gold-300/60">
            <h3 className="text-xl font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gold-600" /> Requirements & Eligibility
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Age 18 years or older with valid Indian identity proof (Aadhaar / Voter ID).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Good local communication skills in Kannada (English/Hindi optional bonus).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Smartphone with active WhatsApp connection for order logging.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                <span>Two-wheeler / bike ownership is preferred for active field coverage.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center glass-panel p-8 rounded-3xl border border-gold-400 space-y-4">
          <h3 className="text-2xl font-serif font-bold text-charcoal">Ready to Start Earning ₹100–₹150/KG?</h3>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            Complete the 4-step application form online. Takes less than 3 minutes.
          </p>
          <Link
            href="/careers/apply"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 rounded-full shadow-gold-glow hover:shadow-card-hover transition-all"
          >
            Start Application
          </Link>
        </div>

      </div>
    </div>
  );
}
