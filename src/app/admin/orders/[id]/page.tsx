'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  XCircle,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Send,
  Printer,
  ChevronRight,
  Gift,
} from 'lucide-react';

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);

  const [shipmentForm, setShipmentForm] = useState({
    courierProvider: 'Delhivery',
    trackingNumber: '',
    trackingUrl: '',
    shippingFee: 0,
  });

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setShipmentForm((prev) => ({
          ...prev,
          shippingFee: data.order.shippingFee || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change order status to "${newStatus}"?`)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        alert(data.message || 'Failed to update order status');
      }
    } catch (err) {
      alert('Error updating order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (newPaymentStatus: string) => {
    if (!confirm(`Are you sure you want to update payment status to "${newPaymentStatus}"?`)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        alert(data.message || 'Failed to update payment status');
      }
    } catch (err) {
      alert('Error updating payment status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentForm.courierProvider.trim() || !shipmentForm.trackingNumber.trim()) {
      alert('Please provide courier partner name and AWB / tracking number');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/orders/${id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentForm),
      });
      const data = await res.json();
      if (data.success) {
        setShipmentModalOpen(false);
        fetchOrderDetail();
      } else {
        alert(data.message || 'Failed to dispatch shipment');
      }
    } catch (err) {
      alert('Error dispatching shipment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-stone-500 text-sm">
        Loading order fulfillment details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center space-y-4">
        <p className="text-stone-700 font-bold">Order not found.</p>
        <Link href="/admin/orders" className="text-xs bg-amber-500 text-amber-950 font-bold px-4 py-2 rounded-xl">
          Back to Orders List
        </Link>
      </div>
    );
  }

  const latestShipment = order.shipments?.[0] || null;
  const latestPayment = order.payments?.[0] || null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416] pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition"
              title="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold text-stone-900">{order.orderNumber}</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                  {order.orderStatus}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                  {order.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Created: {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          {/* Status Actions & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            {/* Quick Step Buttons */}
            {order.orderStatus === 'NEW' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('CONFIRMED')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Confirm Order
              </button>
            )}

            {order.orderStatus === 'CONFIRMED' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('PROCESSING')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Mark Processing
              </button>
            )}

            {order.orderStatus === 'PROCESSING' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('PACKED')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Mark Packed
              </button>
            )}

            {['PACKED', 'PROCESSING', 'CONFIRMED'].includes(order.orderStatus) && (
              <button
                onClick={() => setShipmentModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch Shipment</span>
              </button>
            )}

            {order.orderStatus === 'SHIPPED' && (
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus('DELIVERED')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Mark Delivered
              </button>
            )}

            {/* Direct Order Status Selector */}
            <select
              value={order.orderStatus}
              disabled={actionLoading}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              <option value="NEW">Status: NEW</option>
              <option value="CONFIRMED">Status: CONFIRMED</option>
              <option value="PROCESSING">Status: PROCESSING</option>
              <option value="PACKED">Status: PACKED</option>
              <option value="SHIPPED">Status: SHIPPED</option>
              <option value="DELIVERED">Status: DELIVERED</option>
              <option value="CANCELLED">Status: CANCELLED</option>
              <option value="RETURNED">Status: RETURNED</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Products, Address, and Shipment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ordered Products Box */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-700" />
              <span>Products Ordered</span>
            </h3>

            <div className="divide-y divide-stone-100">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{item.productNameSnapshot}</h4>
                    <span className="text-stone-500 block pt-0.5">
                      Weight / Variant: <strong className="text-amber-900">{item.weightVariant}</strong> • Unit Price: ₹{item.unitPrice}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-600 block">Qty: {item.quantity}</span>
                    <strong className="text-stone-900 font-mono text-sm">₹{item.totalPrice}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-stone-200 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">₹{order.subtotal}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Referral / Coupon Discount {order.referralCode ? `(${order.referralCode})` : ''}</span>
                  </span>
                  <span className="font-mono">-₹{order.discount}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Delivery / Shipping Charge</span>
                <span className="font-mono font-semibold">
                  {order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-100">
                <span>Final Total Payable</span>
                <span className="font-mono text-base text-amber-900">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-700" />
              <span>Complete Delivery Address</span>
            </h3>

            <div className="bg-[#FAF7F0] rounded-xl p-4 border border-amber-200/60 text-xs space-y-1.5">
              <strong className="block text-stone-900 text-sm">{order.shippingAddress?.recipientName}</strong>
              <p className="text-stone-700 font-medium">{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p className="text-stone-600">{order.shippingAddress.addressLine2}</p>}
              {order.shippingAddress?.area && <p className="text-stone-600"><strong>Area / Locality:</strong> {order.shippingAddress.area}</p>}
              <p className="text-stone-800 font-semibold">
                <strong>City:</strong> {order.shippingAddress?.city} • <strong>State:</strong> {order.shippingAddress?.state} • <strong>Pincode:</strong> <span className="font-mono text-amber-900 font-bold">{order.shippingAddress?.pincode}</span>
              </p>
              {order.shippingAddress?.landmark && (
                <p className="text-amber-800 pt-1">
                  <strong>Landmark:</strong> {order.shippingAddress.landmark}
                </p>
              )}
              <p className="text-stone-500 pt-1 font-mono">Recipient Mobile: {order.shippingAddress?.mobileNumber}</p>
            </div>
          </div>

          {/* Shipment & Tracking Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-700" />
                <span>Shipping Provider & Tracking</span>
              </h3>
              <button
                onClick={() => setShipmentModalOpen(true)}
                className="text-xs text-amber-800 hover:text-amber-900 font-bold underline"
              >
                {latestShipment ? 'Edit Shipment Info' : '+ Add Shipment Info'}
              </button>
            </div>

            {latestShipment ? (
              <div className="bg-[#FAF7F0] rounded-xl p-4 border border-amber-200/60 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-stone-500 block">Shipping Provider:</span>
                    <strong className="text-stone-900 text-sm">{latestShipment.courierProvider}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">AWB / Tracking Number:</span>
                    <strong className="font-mono text-amber-900 text-sm">{latestShipment.trackingNumber || 'Pending'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Shipping Status:</span>
                    <span className="font-bold text-emerald-800">{latestShipment.status}</span>
                  </div>
                </div>
                {latestShipment.trackingUrl && (
                  <div className="pt-2">
                    <a
                      href={latestShipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-bold underline"
                    >
                      <span>Open Courier Tracking Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">No courier shipment has been dispatched yet for this order.</p>
            )}
          </div>
        </div>

        {/* Right Col: Customer Info & Payment Details */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-amber-700" />
              <span>Customer Details</span>
            </h3>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-stone-500 block">Customer Name</span>
                <strong className="text-stone-900 text-sm">{order.customer?.name}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">Mobile Number</span>
                <a
                  href={`https://wa.me/91${order.customer?.mobile.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-amber-800 hover:underline flex items-center gap-1 pt-0.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{order.customer?.mobile}</span>
                  <span className="text-[10px] text-emerald-700 font-sans font-normal">(Chat on WhatsApp)</span>
                </a>
              </div>
              <div>
                <span className="text-stone-500 block">Email Address</span>
                <span className="font-mono text-stone-800">{order.customer?.email}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Payment Details</span>
            </h3>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-stone-500 block mb-1">Payment Status:</span>
                <select
                  value={order.paymentStatus}
                  disabled={actionLoading}
                  onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none"
                >
                  <option value="PAID">PAID</option>
                  <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUND_PENDING">REFUND_PENDING</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div>
                <span className="text-stone-500 block">Payment Method</span>
                <strong className="text-stone-900">
                  {latestPayment?.paymentMethod || (order.razorpayPaymentId ? 'Razorpay Online (UPI/Cards)' : 'Cash On Delivery')}
                </strong>
              </div>

              <div>
                <span className="text-stone-500 block">Payment Date / Time</span>
                <span className="text-stone-800">
                  {latestPayment?.createdAt
                    ? new Date(latestPayment.createdAt).toLocaleString('en-IN')
                    : new Date(order.createdAt).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Razorpay Order ID</span>
                <span className="font-mono text-stone-800 select-all block bg-stone-50 p-1.5 rounded border border-stone-200">
                  {order.razorpayOrderId || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Razorpay Payment ID</span>
                <span className="font-mono text-stone-800 select-all block bg-stone-50 p-1.5 rounded border border-stone-200">
                  {order.razorpayPaymentId || 'N/A'}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-stone-500 block">Final Total Captured</span>
                <strong className="font-mono text-amber-900 text-base">₹{order.total}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Shipment Dispatch Modal */}
      {shipmentModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-700" />
              <span>Dispatch Courier Shipment</span>
            </h3>
            <p className="text-xs text-stone-500">
              Enter courier partner and AWB/tracking code to mark order <strong>{order.orderNumber}</strong> as SHIPPED.
            </p>

            <form onSubmit={handleDispatchShipment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Courier Partner *</label>
                <input
                  type="text"
                  value={shipmentForm.courierProvider}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, courierProvider: e.target.value })}
                  placeholder="e.g. Delhivery, Bluedart, Shiprocket, DTDC"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">AWB / Tracking Number *</label>
                <input
                  type="text"
                  value={shipmentForm.trackingNumber}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })}
                  placeholder="e.g. DEL782390145"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Online Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={shipmentForm.trackingUrl}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, trackingUrl: e.target.value })}
                  placeholder="https://delhivery.com/track/package/..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShipmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-4 py-2 rounded-xl transition shadow-sm"
                >
                  Dispatch & Mark SHIPPED
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
