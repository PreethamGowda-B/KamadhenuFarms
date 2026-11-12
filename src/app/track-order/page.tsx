'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomerNotificationBanner from '@/components/CustomerNotificationBanner';
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
  Printer,
  Download,
  Sparkles,
  User,
  Mail,
  CreditCard,
  RotateCcw,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react';

interface OrderItem {
  id?: string;
  productId?: string;
  productName?: string;
  productNameSnapshot?: string;
  weightVariant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderData {
  id?: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string;
  advanceAmount?: number | null;
  advancePaidAmount?: number | null;
  codRemainingAmount?: number | null;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  total: number;
  customer?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
  customerName?: string;
  shippingAddress?: {
    recipientName?: string;
    mobileNumber?: string;
    addressLine1?: string;
    area?: string | null;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string | null;
  };
  destination?: string;
  items: OrderItem[];
  payment?: {
    provider?: string;
    paymentId?: string;
    status?: string;
    amount?: number;
    paidAt?: string;
  } | null;
  shipment?: {
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status?: string;
    shippedAt?: string;
    deliveredAt?: string;
  } | null;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const urlOrderNumber = searchParams.get('orderNumber') || searchParams.get('order_id') || searchParams.get('order') || '';
  const urlMobile = searchParams.get('mobile') || searchParams.get('phone') || '';
  const urlOrderToken = searchParams.get('token') || '';
  const isJustConfirmed = searchParams.get('status') === 'confirmed';

  const [orderNumber, setOrderNumber] = useState(urlOrderNumber);
  const [mobile, setMobile] = useState(urlMobile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [showSearchForm, setShowSearchForm] = useState(!urlOrderNumber);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  // Auto-fill from URL or localStorage and execute lookup on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear pending order flag so returning to home page never causes an unwanted loop
        localStorage.removeItem('kamadhenu_pending_order');
        localStorage.removeItem('kamadhenu_pending_order_time');

        const savedOrder = localStorage.getItem('kamadhenu_last_order') || '';
        const savedMobile = localStorage.getItem('kamadhenu_customer_mobile') || '';
        const targetOrd = urlOrderNumber || savedOrder;
        const targetMob = urlMobile || savedMobile;

        if (targetOrd && !orderNumber) setOrderNumber(targetOrd);
        if (targetMob && !mobile) setMobile(targetMob);

        if (targetOrd) {
          executeTrack(targetOrd, targetMob);
        }
      } catch (e) {}
    }
  }, []);

  const executeTrack = async (targetOrder: string, targetMobile: string) => {
    const cleanOrd = targetOrder.trim().toUpperCase();
    if (!cleanOrd) {
      setError('Please enter your Order Reference (e.g. KHF-ORD-68577332)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. First attempt: fetch full invoice & order management details
      let fetchedOrder: OrderData | null = null;
      const tokenQuery = urlOrderToken ? `&token=${encodeURIComponent(urlOrderToken)}` : '';
      try {
        const invoiceRes = await fetch(`/api/orders/invoice?orderNumber=${encodeURIComponent(cleanOrd)}${targetMobile ? `&mobile=${encodeURIComponent(targetMobile)}` : ''}${tokenQuery}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        const invoiceData = await invoiceRes.json();
        if (invoiceData.success && invoiceData.order) {
          fetchedOrder = invoiceData.order;
        }
      } catch (e) {
        // Fallback to tracking endpoint
      }

      // 2. Fallback: query tracking endpoint if invoice endpoint required additional auth
      if (!fetchedOrder) {
        const mobileQuery = targetMobile.trim() ? `&mobile=${encodeURIComponent(targetMobile.trim())}` : '';
        const trackRes = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(cleanOrd)}${mobileQuery}${tokenQuery}`);
        const trackData = await trackRes.json();

        if (trackData.success && trackData.order) {
          fetchedOrder = trackData.order;
        } else {
          setError(trackData.message || 'No order found with the provided details. Please verify your order number.');
        }
      }

      if (fetchedOrder) {
        setOrderData(fetchedOrder);
        setShowSearchForm(false);
        // Persist to localStorage for easy revisit
        try {
          localStorage.setItem('kamadhenu_last_order', cleanOrd);
          if (fetchedOrder.customer?.mobile) {
            localStorage.setItem('kamadhenu_customer_mobile', fetchedOrder.customer.mobile);
          }
        } catch (e) {}
      }
    } catch (err: any) {
      setError('Unable to retrieve order details right now. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeTrack(orderNumber, mobile);
  };

  const copyOrderNumber = () => {
    if (!orderData?.orderNumber) return;
    navigator.clipboard?.writeText(orderData.orderNumber);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleReorder = () => {
    if (!orderData?.items) return;
    try {
      const existingCart = JSON.parse(localStorage.getItem('kamadhenu_cart') || '[]');
      const newCart = [...existingCart];

      orderData.items.forEach((it) => {
        const pId = it.productId || 'p1';
        const variant = it.weightVariant || '500g';
        const qty = it.quantity || 1;
        const existingIdx = newCart.findIndex((c) => c.id === pId && c.variant === variant);
        if (existingIdx > -1) {
          newCart[existingIdx].qty += qty;
        } else {
          newCart.push({ id: pId, variant, qty });
        }
      });

      localStorage.setItem('kamadhenu_cart', JSON.stringify(newCart));
      window.location.href = '/?openCart=true';
    } catch (e) {
      window.location.href = '/';
    }
  };

  const steps = [
    { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Order verified & recorded at our farm' },
    { key: 'PAID', label: 'Payment Verified', desc: 'Securely received via Cashfree / UPI' },
    { key: 'PACKED', label: 'Hygienically Packed', desc: 'Cushion-wrapped jar boxed for transit' },
    { key: 'SHIPPED', label: 'Dispatched in Transit', desc: 'Handed over to Bangalore courier partner' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Enjoy pure and natural raw farm honey' },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string, paymentStatus: string) => {
    const statusRanks: Record<string, number> = {
      NEW: 1,
      CONFIRMED: 2,
      PROCESSING: 2,
      PACKED: 3,
      SHIPPED: 4,
      DELIVERED: 5,
    };

    if (stepKey === 'PAID') {
      return (paymentStatus === 'PAID' || paymentStatus === 'COD_ADVANCE_PAID' || paymentStatus === 'FULLY_PAID') ? 'completed' : 'pending';
    }

    const currentRank = statusRanks[currentStatus] || 1;
    const targetRank = statusRanks[stepKey] || 1;

    if (currentStatus === 'CANCELLED') return 'cancelled';
    if (currentRank > targetRank) return 'completed';
    if (currentRank === targetRank) return 'active';
    return 'pending';
  };

  const displayOrderNum = orderData?.orderNumber || orderNumber;
  const isPaid = orderData?.paymentStatus === 'PAID' || orderData?.paymentStatus === 'COD_ADVANCE_PAID' || orderData?.paymentStatus === 'FULLY_PAID';
  const customerName = orderData?.customer?.name || orderData?.customerName || 'Valued Customer';
  const formattedDate = orderData?.createdAt
    ? new Date(orderData.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Print-specific style sheet */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print,
          header,
          footer,
          nav,
          .non-print-section {
            display: none !important;
          }
          .print-only-invoice {
            display: block !important;
            box-shadow: none !important;
            border: 2px solid #d8a64f !important;
            border-radius: 16px !important;
            width: 100% !important;
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 24px !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        
        {/* ===================================================================
             TOP HEADER BRANDING
             =================================================================== */}
        <div className="non-print-section flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-amber-200/60 gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }}
            className="inline-flex items-center gap-2 group cursor-pointer"
          >
            <span className="text-2xl">🍯</span>
            <div>
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-amber-950 block">
                KAMADHENU <span className="text-amber-600">HONEY FARMS</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase text-amber-800 font-semibold block">
                Apiary & Farm Direct • Taverekere, Bangalore
              </span>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-amber-800 bg-white border border-amber-200 px-3.5 py-1.5 rounded-full shadow-sm transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-amber-700" />
              <span>Back to Store</span>
            </a>
          </div>
        </div>

        {/* ===================================================================
             POST-PAYMENT CELEBRATION BANNER (Visible right after payment)
             =================================================================== */}
        {(isJustConfirmed || isPaid) && orderData && (
          <div className="non-print-section bg-gradient-to-r from-emerald-50 via-amber-50 to-emerald-50 rounded-2xl p-4 sm:p-5 border border-emerald-300/80 shadow-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Payment Verified • Order Confirmed</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-stone-900">
                  Thank you, {customerName}! Your honey order is recorded.
                </h2>
                <p className="text-xs text-stone-600 pt-0.5">
                  Our apiary team in Taverekere is preparing your cushion-wrapped parcel.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition shrink-0 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Invoice</span>
            </button>
          </div>
        )}

        {/* ===================================================================
             MAIN ACTIVE ORDER CARD (Order Management + Live Stepper)
             =================================================================== */}
        {orderData && (
          <div className="non-print-section bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-900/5 border border-amber-200/80 space-y-6">
            
            {/* Order Title & Identification Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-stone-200 gap-4">
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Active Order Reference
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-950">
                    {orderData.orderNumber}
                  </span>
                  <button
                    onClick={copyOrderNumber}
                    title="Copy Order ID"
                    className="p-1.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                  >
                    {copiedOrder ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <span className="text-xs text-stone-500 block pt-1">
                  Ordered by <strong>{customerName}</strong> • {formattedDate}
                </span>
              </div>

              {/* Status Tags */}
              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  Payment: {orderData.paymentStatus}
                </span>
                <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full">
                  Status: {orderData.orderStatus}
                </span>
              </div>
            </div>

            {/* Quick Interactive Actions Toolbar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="bg-amber-50 hover:bg-amber-100/80 text-amber-950 font-bold py-2.5 px-3 rounded-xl border border-amber-200 text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>Tax Invoice</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold py-2.5 px-3 rounded-xl border border-stone-200 text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleReorder}
                className="bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold py-2.5 px-3 rounded-xl border border-stone-200 text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Reorder Items</span>
              </button>

              <a
                href={`https://wa.me/919980114675?text=${encodeURIComponent(
                  `Hi Kamadhenu Honey Farms, I would like an update on my order ${orderData.orderNumber}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold py-2.5 px-3 rounded-xl border border-emerald-200 text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Farm Support</span>
              </a>
            </div>

            {/* Live Step Progress Timeline */}
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Live Shipment & Fulfillment Tracker</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Live Farm Dispatch
                </span>
              </div>

              <div className="relative border-l-2 border-amber-200/80 ml-3.5 pl-6 space-y-6">
                {steps.map((step) => {
                  const state = getStepStatus(step.key, orderData.orderStatus, orderData.paymentStatus);
                  const isCompleted = state === 'completed';
                  const isActive = state === 'active';

                  return (
                    <div key={step.key} className="relative">
                      {/* Step Circle Indicator */}
                      <div
                        className={`absolute -left-[32px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                            ? 'bg-amber-500 text-amber-950 ring-4 ring-amber-100 animate-pulse'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {isCompleted ? '✓' : isActive ? '●' : '○'}
                      </div>

                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            isCompleted ? 'text-emerald-900' : isActive ? 'text-amber-900 font-extrabold' : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p className="text-xs text-stone-500 pt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Dispatch Banner (If tracking assigned) */}
            {orderData.shipment && orderData.shipment.trackingNumber && (
              <div className="bg-gradient-to-r from-amber-50 to-stone-50 rounded-2xl p-5 border border-amber-300/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <Truck className="w-5 h-5 text-amber-700" />
                    <span>Courier Assigned</span>
                  </div>
                  <span className="text-[11px] font-mono bg-amber-200/60 text-amber-900 font-bold px-2 py-0.5 rounded">
                    {orderData.shipment.status || 'IN_TRANSIT'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700">
                  <div>
                    <span className="text-stone-500 block">Courier Partner:</span>
                    <strong className="text-stone-900 text-sm">{orderData.shipment.courier || 'Bangalore Courier'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">AWB / Tracking Number:</span>
                    <strong className="font-mono text-amber-900 text-sm">{orderData.shipment.trackingNumber}</strong>
                  </div>
                </div>
                {orderData.shipment.trackingUrl && (
                  <div className="pt-1">
                    <a
                      href={orderData.shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                    >
                      <span>Track on Courier Website ↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Ordered Products Breakdown */}
            <div className="bg-[#FAF7F0] rounded-2xl p-5 border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Ordered Products ({orderData.items?.length || 1})
                </h4>
                <span className="text-xs font-bold text-amber-900 font-mono">
                  Total Paid: ₹{Number(orderData.total).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="divide-y divide-amber-200/60 text-xs">
                {(orderData.items || []).map((it, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <strong className="text-stone-900 text-sm block">
                        {it.productNameSnapshot || it.productName || 'Pure Raw Honey'}
                      </strong>
                      <span className="text-stone-500 block">
                        Variant: <strong className="text-stone-700">{it.weightVariant}</strong> • Qty: <strong className="text-amber-900">{it.quantity}</strong>
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-stone-900 font-bold block text-sm">
                        ₹{(it.totalPrice || it.unitPrice * it.quantity || 0).toLocaleString('en-IN')}
                      </span>
                      {it.quantity > 1 && (
                        <span className="text-[10px] text-stone-400 block">
                          ₹{it.unitPrice} each
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Details Breakdown */}
              <div className="pt-3 border-t border-amber-200/80 space-y-1 text-xs text-stone-600">
                {orderData.subtotal && (
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{orderData.subtotal}</span>
                  </div>
                )}
                {typeof orderData.shippingFee === 'number' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className={orderData.shippingFee === 0 ? 'text-emerald-700 font-bold' : ''}>
                      {orderData.shippingFee === 0 ? 'FREE' : `₹${orderData.shippingFee}`}
                    </span>
                  </div>
                )}
                {orderData.discount && orderData.discount > 0 ? (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Applied</span>
                    <span>-₹{orderData.discount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-amber-200">
                  <span>Total Amount Paid</span>
                  <span className="text-amber-900 font-mono font-extrabold text-base">
                    ₹{Number(orderData.total).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Destination Snapshot */}
            {orderData.shippingAddress && (
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <div className="text-stone-800 space-y-1">
                  <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-800" />
                    <span>{orderData.shippingAddress.recipientName || customerName}</span>
                  </div>
                  <div className="text-stone-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                    <span>
                      {orderData.shippingAddress.addressLine1}
                      {orderData.shippingAddress.area ? `, ${orderData.shippingAddress.area}` : ''},{' '}
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state} -{' '}
                      <strong>{orderData.shippingAddress.pincode}</strong>
                      {orderData.shippingAddress.landmark ? ` (Landmark: ${orderData.shippingAddress.landmark})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
             PUSH NOTIFICATIONS OPT-IN BANNER
             =================================================================== */}
        {orderData && (
          <div className="non-print-section">
            <CustomerNotificationBanner orderNumber={orderData.orderNumber} />
          </div>
        )}

        {/* ===================================================================
             LOOK UP / TRACK ANOTHER ORDER (Collapsible Form)
             =================================================================== */}
        <div className="non-print-section bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-900/5 border border-amber-200/60 space-y-4">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowSearchForm(!showSearchForm)}>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {orderData ? 'Track Another Order' : 'Locate Your Order'}
              </h3>
              <p className="text-xs text-stone-500">
                Enter your Order Reference and 10-digit mobile number to view details.
              </p>
            </div>
            <button
              type="button"
              className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition"
            >
              {showSearchForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showSearchForm && (
            <form onSubmit={handleTrackSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                    Order Reference *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. KHF-ORD-68577332"
                      className="w-full bg-[#FAF7F0] border border-amber-200 rounded-xl px-4 py-3 font-mono font-semibold text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 uppercase"
                      required
                    />
                    <Package className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                    Mobile Number (Optional for verified)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full bg-[#FAF7F0] border border-amber-200 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
                className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-950 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition active:scale-[0.99] text-sm"
              >
                {loading ? (
                  <span>Fetching Order Details...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search Order</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* ===================================================================
             INVOICE VIEW & PRINT CONTAINER (Both for modal and @media print)
             =================================================================== */}
        <div
          ref={invoiceRef}
          id="official-invoice"
          className={`${
            showInvoiceModal ? 'block' : 'hidden'
          } print-only-invoice bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-stone-200/90 relative text-stone-900 space-y-6`}
        >
          {/* Modal Close & Print Action Buttons */}
          <div className="no-print flex justify-between items-center pb-4 border-b border-stone-200">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Official Tax Invoice / Bill of Supply
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 text-xs"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Official Farm Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-stone-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍯</span>
                <span className="font-serif text-2xl font-bold tracking-tight text-amber-950">
                  KAMADHENU <span className="text-amber-600">HONEY FARMS</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 pt-1">
                Pure Natural Honey & Apiary Delicacies • Certified Organic Sourcing
              </p>
              <p className="text-xs text-stone-500">
                Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore South, Karnataka 562130
              </p>
              <p className="text-xs text-stone-500 font-mono">
                Support: contact@kamadhenuhoneyfarms.in • WhatsApp: +91 9980114675
              </p>
            </div>

            <div className="text-left sm:text-right bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:min-w-[200px]">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-800 block">
                Official Bill of Supply
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4 border-b border-stone-100 text-xs sm:text-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Billed & Shipped To:
              </span>
              <div className="font-bold text-stone-900 text-sm">
                {orderData?.shippingAddress?.recipientName || customerName}
              </div>
              {orderData?.customer?.mobile && (
                <div className="text-stone-600">
                  +91 {orderData.customer.mobile}
                </div>
              )}
              {orderData?.shippingAddress && (
                <div className="text-stone-600 text-xs">
                  {orderData.shippingAddress.addressLine1}
                  {orderData.shippingAddress.area ? `, ${orderData.shippingAddress.area}` : ''},{' '}
                  {orderData.shippingAddress.city}, {orderData.shippingAddress.state} - {orderData.shippingAddress.pincode}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Payment Details:
              </span>
              <div className="text-emerald-700 font-bold text-xs">
                {isPaid ? 'PAID & CAPTURED (100% VERIFIED)' : orderData?.paymentStatus}
              </div>
              {orderData?.payment?.paymentId && (
                <div className="text-stone-500 font-mono text-[11px]">
                  Txn ID: {orderData.payment.paymentId}
                </div>
              )}
              <div className="text-stone-500 text-xs">
                Mode: Cashfree Official PG (UPI/Netbanking)
              </div>
            </div>
          </div>

          {/* Itemized Invoice Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-stone-200 text-stone-500 uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Variant</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(orderData?.items || []).map((item, index) => (
                  <tr key={item.id || index} className="text-stone-800">
                    <td className="py-2.5 px-2 font-mono text-stone-400">{index + 1}</td>
                    <td className="py-2.5 px-2 font-medium">
                      {item.productNameSnapshot || item.productName || 'Pure Raw Honey'}
                    </td>
                    <td className="py-2.5 px-2 text-center text-stone-600">{item.weightVariant}</td>
                    <td className="py-2.5 px-2 text-center font-bold">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right font-mono">₹{item.unitPrice}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold">
                      ₹{item.totalPrice || item.unitPrice * item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Total */}
          <div className="pt-4 border-t-2 border-stone-200 flex justify-end">
            <div className="w-full sm:w-64 space-y-1.5 text-xs text-stone-600">
              {orderData?.subtotal && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{orderData.subtotal}</span>
                </div>
              )}
              {typeof orderData?.shippingFee === 'number' && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="font-mono">{orderData.shippingFee === 0 ? 'FREE' : `₹${orderData.shippingFee}`}</span>
                </div>
              )}
              {orderData?.discount && orderData.discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{orderData.discount}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-300">
                <span>Total Paid:</span>
                <span className="font-mono text-amber-950 font-extrabold">
                  ₹{Number(orderData?.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Legal / Signatory footer */}
          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-stone-400 gap-2">
            <div>
              <p>Certified FSSAI & Chemical-free Raw Honey.</p>
              <p>This is a computer-generated tax bill of supply.</p>
            </div>
            <div className="text-left sm:text-right font-mono">
              <span>Authorized Signatory • Kamadhenu Honey Farms</span>
            </div>
          </div>
        </div>

        {/* ===================================================================
             BOTTOM RETURN TO HOME LINK
             =================================================================== */}
        <div className="non-print-section text-center pt-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-amber-800 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Kamadhenu Honey Farms Store</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-sm font-semibold text-amber-900">
          Loading order management hub...
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
