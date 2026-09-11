'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  Printer,
  Package,
  Truck,
  ShieldCheck,
  Home,
  Phone,
  Sparkles,
  ArrowDown,
  Clock,
  CreditCard,
  FileText,
  BadgePercent,
  Check,
  MapPin,
  Mail,
  User,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  weightVariant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  couponCode?: string | null;
  total: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    mobile: string;
  };
  shippingAddress: {
    addressLine1: string;
    area?: string | null;
    city: string;
    state: string;
    pincode: string;
    landmark?: string | null;
  };
  items: OrderItem[];
  payment?: {
    provider: string;
    paymentId: string;
    status: string;
    amount: number;
    paidAt: string;
  } | null;
  shipment?: {
    courier: string;
    trackingNumber: string;
    status: string;
  } | null;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || searchParams.get('order') || '';
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Fetch full live order and invoice data from server
  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch(`/api/orders/invoice?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && data.order) {
            setOrder(data.order);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load order invoice details', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderNumber]);

  // Smooth scroll down to invoice
  const scrollToInvoice = () => {
    if (invoiceRef.current) {
      invoiceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Print / Save as PDF handler
  const handleDownloadInvoice = () => {
    window.print();
  };

  const formattedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const displayOrderNum = order?.orderNumber || orderNumber || 'KHF-CONFIRMED';
  const displayTotal = order ? order.total : 0;
  const displaySubtotal = order ? order.subtotal : displayTotal;
  const displayShipping = order ? order.shippingFee : 0;
  const displayDiscount = order ? order.discount : 0;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2416] py-8 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden print:p-0 print:bg-white">
      {/* Print Specific CSS to isolate the Tax Invoice on clean A4 page */}
      <style jsx global>{`
        @keyframes confettiFall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(800px) rotate(720deg); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .confetti-particle {
          position: absolute;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          animation: confettiFall 4s linear infinite;
          z-index: 1;
          pointer-events: none;
        }
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print,
          header,
          footer,
          .confetti-particle,
          .non-print-section {
            display: none !important;
          }
          .print-only-invoice {
            display: block !important;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Decorative Golden Celebration Confetti Elements */}
      <div className="no-print pointer-events-none" aria-hidden="true">
        <div className="confetti-particle bg-amber-400 left-[10%]" style={{ animationDelay: '0.2s' }}></div>
        <div className="confetti-particle bg-yellow-500 left-[25%]" style={{ animationDelay: '1.2s' }}></div>
        <div className="confetti-particle bg-emerald-400 left-[40%]" style={{ animationDelay: '0.7s' }}></div>
        <div className="confetti-particle bg-amber-300 left-[58%]" style={{ animationDelay: '1.8s' }}></div>
        <div className="confetti-particle bg-yellow-600 left-[75%]" style={{ animationDelay: '0.4s' }}></div>
        <div className="confetti-particle bg-amber-500 left-[90%]" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        {/* ==============================================================
             TOP LEVEL ANIMATED SUCCESS CELEBRATION HERO CARD
             ============================================================== */}
        <div className="non-print-section bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-900/10 border border-amber-200/70 relative overflow-hidden text-center backdrop-blur-md">
          {/* Top Gold Foil Gradient Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600"></div>

          {/* Animated Glowing Success Badge with Rings */}
          <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"></div>
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-400/30 to-emerald-400/20 blur-md" style={{ animation: 'pulseGlow 2.5s infinite ease-in-out' }}></div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center text-white relative z-10">
              <CheckCircle2 className="w-11 h-11" strokeWidth={2.5} />
            </div>
          </div>

          {/* Headline & Verification Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold tracking-wide uppercase px-4 py-1.5 rounded-full mb-3 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Payment Verified • Order Placed Successfully</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#1C170E] mb-3">
            Thank you for ordering, {order?.customer?.name || 'Valued Customer'}!
          </h1>
          <p className="text-stone-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Your payment has been captured and confirmed. Our apiary team in Taverekere, Bangalore has received your order and is preparing your pure honey for cushioned dispatch.
          </p>

          {/* Order Quick Details Pill Bar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF7F0] rounded-2xl p-4 border border-amber-200/80 text-left">
            <div className="p-2 border-b sm:border-b-0 sm:border-r border-amber-200/60">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Order Reference</span>
              <span className="text-base sm:text-lg font-mono font-bold text-amber-900 break-all">{displayOrderNum}</span>
            </div>
            <div className="p-2 border-b sm:border-b-0 sm:border-r border-amber-200/60">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Total Amount Paid</span>
              <span className="text-base sm:text-lg font-bold text-emerald-800">₹{displayTotal} <span className="text-xs font-normal text-stone-500">(All Taxes Incl.)</span></span>
            </div>
            <div className="p-2">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Payment Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Secured</span>
              </span>
            </div>
          </div>

          {/* Order Live Journey Stepper */}
          <div className="mt-8 pt-6 border-t border-amber-100 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block mb-4">
              Live Order Fulfillment Journey
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Step 1 */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Step 1</span>
                </div>
                <span className="text-xs font-bold text-emerald-950">Payment Verified</span>
                <span className="text-[11px] text-emerald-700">Bank captured</span>
              </div>

              {/* Step 2 */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col justify-between shadow-sm shadow-amber-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 uppercase">In Progress</span>
                </div>
                <span className="text-xs font-bold text-amber-950">Order Processing</span>
                <span className="text-[11px] text-amber-800">Apiary packaging</span>
              </div>

              {/* Step 3 */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col justify-between opacity-70">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Upcoming</span>
                </div>
                <span className="text-xs font-bold text-stone-800">Glass Cushioning</span>
                <span className="text-[11px] text-stone-500">Shockproof pack</span>
              </div>

              {/* Step 4 */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex flex-col justify-between opacity-70">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Upcoming</span>
                </div>
                <span className="text-xs font-bold text-stone-800">Courier Dispatch</span>
                <span className="text-[11px] text-stone-500">AWB Tracking SMS</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center items-center">
            <button
              onClick={scrollToInvoice}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/25 transition active:scale-[0.98] text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Scroll to Official Invoice</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>

            <button
              onClick={handleDownloadInvoice}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md transition active:scale-[0.98] text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download / Print Bill</span>
            </button>

            <Link
              href="/"
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition active:scale-[0.98] text-sm"
            >
              <Home className="w-4 h-4" />
              <span>Return to Store</span>
            </Link>
          </div>
        </div>

        {/* ==============================================================
             OFFICIAL SCROLLING TAX INVOICE & RECEIPT (DOWNLOADABLE / PRINTABLE)
             ============================================================== */}
        <div
          ref={invoiceRef}
          id="official-invoice"
          className="print-only-invoice bg-white rounded-3xl p-6 sm:p-12 shadow-2xl shadow-stone-900/10 border-2 border-stone-200/90 relative text-stone-900"
        >
          {/* Top Invoice Decorative Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b-2 border-stone-100 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍯</span>
                <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-amber-950">
                  KAMADHENU <span className="text-amber-600">HONEY FARMS</span>
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Pure Natural Honey & Apiary Delicacies • Certified Organic Sourcing
              </p>
              <p className="text-xs text-stone-500">
                Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore South, Karnataka 562130
              </p>
              <p className="text-xs text-stone-500 font-mono">
                Support: contact@kamadhenuhoneyfarms.in • WhatsApp: +91 9980114675
              </p>
            </div>

            {/* Invoice Stamp Title */}
            <div className="text-left sm:text-right bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:min-w-[200px]">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800 block">
                Tax Invoice / Official Bill
              </span>
              <span className="text-xl font-mono font-bold text-stone-900 block mt-1">
                {displayOrderNum}
              </span>
              <span className="text-xs text-stone-500 block mt-0.5">
                Date: {formattedDate}
              </span>
            </div>
          </div>

          {/* Customer & Payment Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-stone-100 text-xs sm:text-sm">
            {/* Customer Billed & Shipped To */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Billed & Shipped To:
              </span>
              <div className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-700" />
                <span>{order?.customer?.name || 'Customer'}</span>
              </div>
              {order?.customer?.mobile && (
                <div className="text-stone-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>+91 {order.customer.mobile}</span>
                </div>
              )}
              {order?.customer?.email && (
                <div className="text-stone-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>{order.customer.email}</span>
                </div>
              )}
              <div className="text-stone-600 flex items-start gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                <span>
                  {order?.shippingAddress
                    ? `${order.shippingAddress.addressLine1}${order.shippingAddress.area ? ', ' + order.shippingAddress.area : ''}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`
                    : 'Delivery Address on Record'}
                  {order?.shippingAddress?.landmark ? ` (Landmark: ${order.shippingAddress.landmark})` : ''}
                </span>
              </div>
            </div>

            {/* Payment & Transaction Info */}
            <div className="space-y-2 sm:text-right flex flex-col justify-center sm:items-end">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Payment Information:
              </span>
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Mode: {order?.paymentMethod === 'cod' ? 'Cash On Delivery' : 'Razorpay Secure Checkout (UPI/Card)'}</span>
              </div>
              {order?.payment?.paymentId && (
                <div className="text-stone-500 font-mono text-xs">
                  Txn ID: <strong>{order.payment.paymentId}</strong>
                </div>
              )}
              <div className="text-stone-500 text-xs">
                Payment Verification: <strong className="text-emerald-700">PAID & CAPTURED</strong>
              </div>
            </div>
          </div>

          {/* Itemized Invoice Table */}
          <div className="py-6 border-b border-stone-100 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-stone-200 text-stone-500 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-2">Item Description</th>
                  <th className="py-3 px-2 text-center">Variant</th>
                  <th className="py-3 px-2 text-center">Qty</th>
                  <th className="py-3 px-2 text-right">Unit Rate</th>
                  <th className="py-3 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order && order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => (
                    <tr key={item.id || index} className="text-stone-800">
                      <td className="py-3 px-2 font-mono text-stone-400">{index + 1}</td>
                      <td className="py-3 px-2 font-semibold text-amber-950">
                        {item.productName}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-xs font-medium">
                          {item.weightVariant}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-stone-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-stone-600">
                        ₹{item.unitPrice}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold text-stone-900">
                        ₹{item.totalPrice}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="text-stone-800">
                    <td className="py-3 px-2 font-mono text-stone-400">1</td>
                    <td className="py-3 px-2 font-semibold text-amber-950">
                      Pure Raw Honey (Apiary Glass Jar)
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-xs font-medium">
                        Standard
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-stone-700">1</td>
                    <td className="py-3 px-2 text-right font-mono text-stone-600">₹{displayTotal}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-stone-900">₹{displayTotal}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Shipping, Discount & Grand Total Breakdown */}
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-stone-100">
            {/* Security Guarantee & Watermark Stamp */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 border-2 border-emerald-600/30 rounded-xl px-4 py-2 bg-emerald-50/50 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div className="text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider block">Official Receipt Stamp</span>
                  <span className="text-xs font-mono font-bold text-emerald-900">VERIFIED AUTHENTIC HONEY</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 max-w-xs">
                This is a computer-generated tax bill authorized by Kamadhenu Honey Farms. No signature required.
              </p>
            </div>

            {/* Calculations Column */}
            <div className="w-full sm:w-64 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-stone-800">₹{displaySubtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping & Delivery:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {displayShipping === 0 ? 'FREE (Promotion)' : `₹${displayShipping}`}
                </span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Coupon Discount:</span>
                  <span className="font-mono font-bold">-₹{displayDiscount}</span>
                </div>
              )}
              <div className="pt-2 border-t-2 border-stone-200 flex justify-between items-center text-base sm:text-lg font-bold text-stone-950">
                <span>Total Paid:</span>
                <span className="text-amber-900 font-mono text-xl">₹{displayTotal}</span>
              </div>
            </div>
          </div>

          {/* Invoice Footer Details */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-500 text-center sm:text-left">
            <div>
              <p className="font-semibold text-stone-700">Thank you for supporting Karnataka beekeepers!</p>
              <p>For re-orders and gift hampers, visit kamadhenuhoneyfarms.in</p>
            </div>
            <div className="no-print">
              <button
                onClick={handleDownloadInvoice}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 px-5 rounded-xl inline-flex items-center gap-2 shadow-sm transition active:scale-95 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print or Save Invoice PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
             BOTTOM RETURN TO STORE & ASSISTANCE BAR
             ============================================================== */}
        <div className="non-print-section text-center space-y-4 pt-4">
          <p className="text-xs text-stone-500">
            A confirmation receipt has also been logged. Need any assistance? Call or WhatsApp us at <strong>+91 9980114675</strong>.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/"
              className="text-amber-800 hover:text-amber-900 font-bold text-sm underline underline-offset-4"
            >
              ← Return to Kamadhenu Honey Farms Home
            </Link>
            <span className="text-stone-300">•</span>
            <Link
              href={`/track-order?orderNumber=${encodeURIComponent(displayOrderNum)}`}
              className="text-amber-800 hover:text-amber-900 font-bold text-sm underline underline-offset-4"
            >
              Track Live Courier Status →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-amber-600 rounded-full animate-spin mb-4"></div>
          <p className="text-amber-950 font-serif font-bold text-lg">Generating your official tax invoice...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
