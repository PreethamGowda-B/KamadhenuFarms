'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Home,
  Phone,
  Calendar,
  MapPin,
} from 'lucide-react';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get('orderNumber') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Please enter your Order Number (e.g. KHF-ORD-000001)');
      return;
    }
    if (!mobile.trim()) {
      setError('Please enter your 10-digit mobile number for security verification');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setOrderData(null);

      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&mobile=${encodeURIComponent(
          mobile.trim()
        )}`
      );
      const data = await res.json();

      if (data.success && data.order) {
        setOrderData(data.order);
      } else {
        setError(data.message || 'No order found with the provided details');
      }
    } catch (err: any) {
      setError('Unable to track order right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Order verified & recorded' },
    { key: 'PAID', label: 'Payment Received', desc: 'Securely processed via Razorpay' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Harvest & batch allocation' },
    { key: 'PACKED', label: 'Packed', desc: 'Cushion-boxed for transit' },
    { key: 'SHIPPED', label: 'Shipped', desc: 'Handed to courier partner' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Enjoy pure raw honey' },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string, paymentStatus: string) => {
    const statusRanks: Record<string, number> = {
      NEW: 1,
      CONFIRMED: 2,
      PROCESSING: 3,
      PACKED: 4,
      SHIPPED: 5,
      DELIVERED: 6,
    };

    if (stepKey === 'PAID') {
      return paymentStatus === 'PAID' ? 'completed' : 'pending';
    }

    const currentRank = statusRanks[currentStatus] || 1;
    const targetRank = statusRanks[stepKey] || 1;

    if (currentStatus === 'CANCELLED') return 'cancelled';
    if (currentRank > targetRank) return 'completed';
    if (currentRank === targetRank) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="text-xs tracking-[0.2em] font-bold text-amber-800 uppercase block mb-1">
              Kamadhenu Honey Farms
            </span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C170E]">
            Track Your Honey Order
          </h1>
          <p className="text-stone-600 text-sm max-w-md mx-auto">
            Enter your official Order Number and mobile number to inspect live packaging and courier dispatch updates.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-900/5 border border-amber-200/60">
          <form onSubmit={handleTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Order Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KHF-ORD-000001"
                    className="w-full bg-[#FAF7F0] border border-amber-200 rounded-xl px-4 py-3 font-mono font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 uppercase"
                    required
                  />
                  <Package className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-[#FAF7F0] border border-amber-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    required
                  />
                  <Phone className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-950 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-[0.99]"
            >
              {loading ? (
                <span>Locating Your Order...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tracking Results Card */}
        {orderData && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-900/5 border border-amber-200/60 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-stone-200 gap-2">
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Order Details</span>
                <span className="text-2xl font-mono font-bold text-amber-900">{orderData.orderNumber}</span>
                <span className="text-xs text-stone-500 block pt-0.5">Placed for: {orderData.customerName}</span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full font-sans">
                  Payment: {orderData.paymentStatus}
                </span>
                <span className="text-xs text-stone-500 block pt-1.5">
                  Ordered on: {new Date(orderData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Visual Step Timeline */}
            <div className="py-4">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-6">Order Lifecycle</h3>
              <div className="relative border-l-2 border-amber-200 ml-4 pl-6 space-y-6">
                {steps.map((step) => {
                  const state = getStepStatus(step.key, orderData.orderStatus, orderData.paymentStatus);
                  const isCompleted = state === 'completed';
                  const isActive = state === 'active';

                  return (
                    <div key={step.key} className="relative">
                      {/* Step Circle Indicator */}
                      <div
                        className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                            ? 'bg-amber-500 text-amber-950 ring-4 ring-amber-100'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {isCompleted ? '✓' : isActive ? '●' : '○'}
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isCompleted ? 'text-emerald-800' : isActive ? 'text-amber-900' : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p className="text-xs text-stone-500">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Tracking Box (If Dispatched) */}
            {orderData.shipment && orderData.shipment.trackingNumber && (
              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Truck className="w-5 h-5 text-amber-700" />
                  <span>Courier Dispatch Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 pt-1">
                  <div>
                    <span className="text-stone-500 block">Courier Partner:</span>
                    <strong className="text-amber-950">{orderData.shipment.courier}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">AWB / Tracking Number:</span>
                    <strong className="font-mono text-amber-950">{orderData.shipment.trackingNumber}</strong>
                  </div>
                </div>
                {orderData.shipment.trackingUrl && (
                  <div className="pt-2">
                    <a
                      href={orderData.shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                    >
                      <span>Live Courier Tracking Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Items Summary */}
            <div className="bg-[#FAF7F0] rounded-2xl p-5 border border-amber-200/60 space-y-3">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Ordered Products</h4>
              <div className="divide-y divide-amber-200/50 text-xs">
                {orderData.items.map((it: any, idx: number) => (
                  <div key={idx} className="py-2 flex justify-between items-center">
                    <div>
                      <strong className="text-stone-900">{it.productNameSnapshot}</strong>
                      <span className="text-stone-500 block">Variant: {it.weightVariant}</span>
                    </div>
                    <span className="font-bold text-amber-900">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between items-center border-t border-amber-200 text-xs font-bold">
                <span>Total Paid</span>
                <span className="text-amber-950 font-mono text-sm">₹{orderData.total}</span>
              </div>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-amber-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">Loading tracker...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
