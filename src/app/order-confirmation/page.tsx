'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight, Home, ShieldCheck, Truck, Phone } from 'lucide-react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || searchParams.get('order') || 'KHF-ORD-CONFIRMED';
  const amount = searchParams.get('amount') || '';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Decorative Glow */}
      <div className="max-w-2xl w-full bg-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-amber-900/5 border border-amber-200/60 relative overflow-hidden">
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600"></div>

        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>

        {/* Heading */}
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs uppercase tracking-widest font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Payment Verified & Order Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C170E] pt-2">
            Thank you for ordering from Kamadhenu Honey Farms!
          </h1>
          <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto">
            Your fresh, pristine raw honey order has been successfully placed and is now being prepared for doorstep dispatch.
          </p>
        </div>

        {/* Order Card Highlight */}
        <div className="bg-[#FAF7F0] rounded-2xl p-6 border border-amber-200/80 mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-amber-200/60 gap-2">
            <div>
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Official Order Number</span>
              <span className="text-2xl font-mono font-bold text-amber-900">{orderNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm bg-emerald-100/70 px-3 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              <span>Razorpay Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-stone-700 pt-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-700" />
              <span>Status: <strong className="text-amber-950">Confirmed / Processing</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700" />
              <span>Packaging: <strong className="text-amber-950">Carefully Cushion-Boxed</strong></span>
            </div>
          </div>
        </div>

        {/* Next Steps & Support Info */}
        <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 text-xs text-stone-600 space-y-2 mb-8">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Need Assistance with your order?
          </p>
          <p>
            You will receive dispatch notifications once your courier tracking number (AWB) is generated. For any questions, contact us direct via WhatsApp at <strong>+91 9980114675</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/track-order?orderNumber=${encodeURIComponent(orderNumber)}`}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
          >
            <span>Track Order Progress</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">Loading confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
