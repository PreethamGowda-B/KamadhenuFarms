'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Store,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingUp,
  RefreshCw,
  Plus,
  Edit3,
  DollarSign,
  User,
  CreditCard,
  Building2,
  Navigation,
  Check,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Camera
} from 'lucide-react';

export default function ShopProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [orderForm, setOrderForm] = useState({
    productName: 'Pure Honey – 500g',
    quantity: 10,
    unitPrice: 190,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    dueDate: '',
    notes: '',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [visitForm, setVisitForm] = useState({
    purpose: 'ROUTINE_FOLLOW_UP',
    discussion: '',
    orderTaken: false,
    paymentCollected: 0,
    nextFollowUpDate: '',
    notes: '',
  });
  const [submittingVisit, setSubmittingVisit] = useState(false);

  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (id) fetchShopProfile();
  }, [id]);

  async function fetchShopProfile() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/shops/${id}`);
      const data = await res.json();
      if (data.success && data.shop) {
        setShop(data.shop);
        setEditForm({
          shopName: data.shop.shopName,
          ownerName: data.shop.ownerName || data.shop.contactPerson,
          mobile: data.shop.mobile || data.shop.contactNumber,
          whatsapp: data.shop.whatsapp || '',
          email: data.shop.email || '',
          address: data.shop.address,
          area: data.shop.area,
          city: data.shop.city,
          pincode: data.shop.pincode || data.shop.pinCode,
          status: data.shop.status,
          reorderIntervalDays: data.shop.reorderIntervalDays || 30,
          notes: data.shop.notes || '',
        });
      }
    } catch (e) {
      console.error('Error loading shop profile:', e);
    } finally {
      setLoading(false);
    }
  }

  // Handle Order Submit
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingOrder(true);
      const res = await fetch(`/api/shops/${shop.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productName: orderForm.productName,
            quantity: orderForm.quantity,
            unitPrice: orderForm.unitPrice,
            kgPerUnit: orderForm.productName.includes('1kg') ? 1.0 : 0.5,
          }],
          paymentMethod: orderForm.paymentMethod,
          paymentStatus: orderForm.paymentStatus,
          dueDate: orderForm.dueDate || undefined,
          notes: orderForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOrderModal(false);
        fetchShopProfile();
      } else {
        alert(data.message || 'Failed to record order');
      }
    } catch (e) {
      alert('Error creating order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/shops/${shop.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', paymentMethod: 'CASH', reference: '', notes: '' });
        fetchShopProfile();
      } else {
        alert(data.message || 'Failed to record payment');
      }
    } catch (e) {
      alert('Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Visit Submit
  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingVisit(true);
      const res = await fetch(`/api/shops/${shop.id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowVisitModal(false);
        setVisitForm({ purpose: 'ROUTINE_FOLLOW_UP', discussion: '', orderTaken: false, paymentCollected: 0, nextFollowUpDate: '', notes: '' });
        fetchShopProfile();
      } else {
        alert(data.message || 'Failed to log visit');
      }
    } catch (e) {
      alert('Error logging visit');
    } finally {
      setSubmittingVisit(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchShopProfile();
      } else {
        alert(data.message || 'Failed to update shop');
      }
    } catch (e) {
      alert('Error updating shop');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading || !shop) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-amber-700 mx-auto mb-3" />
          <p className="font-serif font-bold text-stone-700">Loading Shop Profile…</p>
        </div>
      </div>
    );
  }

  const cleanMobile = (shop.mobile || shop.contactNumber || '').replace(/[^0-9]/g, '');
  const cleanWhatsApp = (shop.whatsapp || shop.mobile || '').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/shops"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              title="Back to Shops CRM"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-amber-950 font-mono font-bold text-xs px-2 py-0.5 rounded">
                  {shop.shopCode || shop.shopNo}
                </span>
                <h1 className="font-serif font-bold text-xl leading-tight">
                  {shop.shopName}
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {shop.status}
                </span>
              </div>
              <p className="text-xs text-amber-200 mt-0.5">
                {shop.area}, {shop.city} • Assigned Salesperson: <strong>{shop.salesperson?.fullName || shop.salespersonSnapshotName || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${cleanMobile}`}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
            >
              <Phone className="w-3.5 h-3.5" /> Call Shop
            </a>

            <a
              href={`https://wa.me/91${cleanWhatsApp}?text=Hello%20${encodeURIComponent(shop.shopName)},%20this%20is%20Kamadhenu%20Honey%20Farms.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-300"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>

            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-xs"
              title="Edit Shop Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* TOP ROW: PHOTOS & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Shop Photos Gallery */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-700" />
              Shop Verification Photos
            </h3>

            {shop.frontImageUrl ? (
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-amber-300">
                <img src={shop.frontImageUrl} alt="Shop Board" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-xs text-stone-400">
                No board image uploaded
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {shop.interiorImageUrl ? (
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-stone-200">
                  <img src={shop.interiorImageUrl} alt="Interior" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[4/3] rounded-lg bg-stone-50 border border-dashed border-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                  No interior photo
                </div>
              )}

              {shop.otherImageUrl ? (
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-stone-200">
                  <img src={shop.otherImageUrl} alt="Additional" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[4/3] rounded-lg bg-stone-50 border border-dashed border-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                  No extra photo
                </div>
              )}
            </div>
          </div>

          {/* Contact & Location Details */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-700" />
              Contact & Store Profile
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Owner Name</span>
                <span className="font-bold text-stone-900">{shop.ownerName || shop.contactPerson}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Mobile</span>
                <span className="font-bold text-stone-900">{shop.mobile || shop.contactNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Shop Type</span>
                <span className="font-semibold text-stone-800">{shop.shopType || 'Grocery Store'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Potential Level</span>
                <span className="font-bold text-purple-700">{shop.potential || 'MEDIUM'}</span>
              </div>
              <div className="py-1.5">
                <span className="text-stone-500 block mb-0.5">Address</span>
                <span className="text-stone-800 font-medium">{shop.address}, {shop.area}, {shop.city} - {shop.pincode || shop.pinCode}</span>
              </div>
            </div>

            {shop.mapsUrl ? (
              <a
                href={shop.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-amber-300 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-700" />
                Open in Google Maps
              </a>
            ) : null}
          </div>

          {/* Financial & Reorder Forecast Card */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50/40 to-amber-100/30 rounded-2xl p-5 border border-amber-300 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-bold text-sm text-amber-950 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  Sales & Credit Ledger
                </h3>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {shop.totalOrders || 0} Orders
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600">Total Purchase Value</span>
                  <span className="font-serif font-bold text-stone-900 text-sm">
                    ₹{shop.totalPurchaseValue?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Total Honey Delivered</span>
                  <span className="font-bold text-stone-900">{shop.totalKgPurchased || 0} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Outstanding Credit</span>
                  <span className={`font-bold text-sm ${shop.outstandingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    ₹{shop.outstandingAmount?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Credit Limit</span>
                  <span className="font-semibold text-stone-800">₹{shop.creditLimit?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-200">
                  <span className="text-amber-900 font-semibold">Next Expected Reorder</span>
                  <span className="font-bold text-amber-950">
                    {shop.nextReorderDate ? new Date(shop.nextReorderDate).toLocaleDateString('en-IN') : 'None'}
                  </span>
                </div>
                {shop.actualAvgReorderIntervalDays && (
                  <div className="text-[11px] text-amber-800 italic">
                    Calculated from actual order history: every {shop.actualAvgReorderIntervalDays} days
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowOrderModal(true)}
                className="py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Add Order
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <DollarSign className="w-3.5 h-3.5" /> Add Payment
              </button>
            </div>
          </div>
        </div>

        {/* HONEY REQUIREMENTS BREAKDOWN */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
          <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-700" />
            Registered Honey Product Requirements
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shop.requirements?.map((req: any) => (
              <div key={req.id} className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200 space-y-1">
                <span className="font-bold text-xs text-stone-900 block">{req.productName}</span>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>First Qty: <strong>{req.firstOrderQuantity}</strong></span>
                  <span>Monthly: <strong>{req.monthlyQuantity}</strong></span>
                  <span>Cycle: <strong>{req.reorderCycleDays}d</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ORDER HISTORY TABLE */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-3 p-5">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              Order History ({shop.orders?.length || 0})
            </h3>
            <button
              onClick={() => setShowOrderModal(true)}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Order
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-100 text-stone-700 uppercase font-bold">
                <tr>
                  <th className="p-3">Order No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Products & Items</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {shop.orders?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-stone-500">No orders placed yet.</td>
                  </tr>
                ) : (
                  shop.orders?.map((ord: any) => (
                    <tr key={ord.id}>
                      <td className="p-3 font-mono font-bold text-amber-900">{ord.orderNo}</td>
                      <td className="p-3 text-stone-600">{new Date(ord.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 font-medium text-stone-900">
                        {ord.items?.length > 0
                          ? ord.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')
                          : ord.product || 'Pure Honey'}
                      </td>
                      <td className="p-3 font-serif font-bold text-stone-900">
                        ₹{(ord.totalAmount || ord.orderValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold text-stone-700">{ord.paymentMethod}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PHYSICAL VISITS LOG & ACTIVITY TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Visits */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                Physical Visits Log
              </h3>
              <button
                onClick={() => setShowVisitModal(true)}
                className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Log Visit
              </button>
            </div>

            <div className="space-y-3">
              {shop.visits?.length === 0 ? (
                <p className="text-xs text-stone-500">No visits logged yet.</p>
              ) : (
                shop.visits?.map((v: any) => (
                  <div key={v.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900">{v.salespersonName}</span>
                      <span className="text-stone-500">{new Date(v.visitDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-stone-700">{v.discussion}</p>
                    {v.nextFollowUpDate && (
                      <span className="text-[10px] text-amber-900 font-semibold block">
                        Next follow-up: {new Date(v.nextFollowUpDate).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              Activity & Audit Timeline
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {shop.activities?.map((act: any) => (
                <div key={act.id} className="text-xs pb-2 border-b border-stone-100 flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-700 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(act.createdAt).toLocaleString('en-IN')}
                    </span>
                    <p className="text-stone-800 font-medium">{act.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* MODAL: ADD ORDER */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">Record New Order</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Product</label>
                <select
                  value={orderForm.productName}
                  onChange={(e) => setOrderForm({ ...orderForm, productName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                >
                  <option value="Pure Honey – 500g">Pure Honey – 500g</option>
                  <option value="Pure Honey – 1kg">Pure Honey – 1kg</option>
                  <option value="Dry Fruits Honey – 500g">Dry Fruits Honey – 500g</option>
                  <option value="Dry Fruits Honey – 1kg">Dry Fruits Honey – 1kg</option>
                  <option value="Comb Honey in Glass Jar – 500g">Comb Honey – 500g</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Quantity (Jars)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value || '1', 10) })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={orderForm.unitPrice}
                    onChange={(e) => setOrderForm({ ...orderForm, unitPrice: parseFloat(e.target.value || '0') })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Payment Method</label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Payment Status</label>
                  <select
                    value={orderForm.paymentStatus}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                  >
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex justify-between items-center">
                <span className="font-bold text-emerald-900">Total Order Value</span>
                <span className="text-base font-serif font-bold text-emerald-950">
                  ₹{(orderForm.quantity * orderForm.unitPrice).toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow transition"
              >
                {submittingOrder ? 'Saving Order…' : 'Record Order & Forecast Reorder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-300 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 3000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="Transaction UTR"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayment}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow transition"
              >
                {submittingPayment ? 'Saving…' : 'Record Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG VISIT */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-300 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">Log Physical Visit</h3>
              <button onClick={() => setShowVisitModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVisitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Purpose</label>
                <select
                  value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                >
                  <option value="ROUTINE_FOLLOW_UP">Routine Follow-up</option>
                  <option value="REORDER_VISIT">Reorder Delivery</option>
                  <option value="PAYMENT_COLLECTION">Payment Collection</option>
                  <option value="SAMPLE_DROP">Sample Drop</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Discussion Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Notes from store owner discussion..."
                  value={visitForm.discussion}
                  onChange={(e) => setVisitForm({ ...visitForm, discussion: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={visitForm.nextFollowUpDate}
                  onChange={(e) => setVisitForm({ ...visitForm, nextFollowUpDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={submittingVisit}
                className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl shadow transition"
              >
                {submittingVisit ? 'Saving…' : 'Save Visit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SHOP */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">Edit Shop Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={editForm.shopName || ''}
                    onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editForm.ownerName || ''}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={editForm.mobile || ''}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed</option>
                    <option value="FOLLOW_UP_DUE">Follow-up Due</option>
                    <option value="WAITING_FOR_RESPONSE">Waiting for Response</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Area</label>
                  <input
                    type="text"
                    value={editForm.area || ''}
                    onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editForm.pincode || ''}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="w-full p-2 rounded-lg border border-stone-300 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingEdit}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow transition"
              >
                {savingEdit ? 'Updating…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
