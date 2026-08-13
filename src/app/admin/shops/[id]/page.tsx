'use client';

import { useState, useEffect } from 'react';
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
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Send,
  X,
  User
} from 'lucide-react';
import { ShopRecord } from '@/lib/store';

export default function ShopDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [shop, setShop] = useState<ShopRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [orderForm, setOrderForm] = useState({
    product: 'Pure Raw Honey 1kg Jar',
    quantity: '10',
    kg: '10',
    orderValue: '7490',
    paymentStatus: 'PAID',
    deliveryStatus: 'DELIVERED',
    salesExecutive: '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [followUpForm, setFollowUpForm] = useState({
    author: 'Admin User',
    type: 'CALL',
    result: 'NEEDS_STOCK' as any,
    notes: '',
    nextFollowUpDate: '',
  });
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const [editForm, setEditForm] = useState({
    status: 'ACTIVE',
    reorderIntervalDays: '30',
    notes: '',
  });

  const [whatsAppText, setWhatsAppText] = useState('');

  useEffect(() => {
    fetchShopDetail();
  }, [id]);

  const fetchShopDetail = async () => {
    try {
      const res = await fetch(`/api/admin/shops/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setShop(json.data);
        setEditForm({
          status: json.data.status,
          reorderIntervalDays: String(json.data.reorderIntervalDays || 30),
          notes: json.data.notes || '',
        });
        setOrderForm((prev) => ({ ...prev, salesExecutive: json.data.assignedSalesExecutiveName || '' }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    try {
      const res = await fetch(`/api/admin/shops/${id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('Order recorded successfully!');
        setShowOrderModal(false);
        fetchShopDetail();
      } else {
        alert(`Error: ${json.message}`);
      }
    } catch (e) {
      alert('Failed to record order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFollowUp(true);
    try {
      const res = await fetch(`/api/admin/shops/${id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('Follow-up logged successfully!');
        setShowFollowUpModal(false);
        fetchShopDetail();
      } else {
        alert(`Error: ${json.message}`);
      }
    } catch (e) {
      alert('Failed to log follow-up');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/shops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        alert('Shop details updated!');
        setShowEditModal(false);
        fetchShopDetail();
      } else {
        alert(`Error: ${json.message}`);
      }
    } catch (e) {
      alert('Failed to update shop');
    }
  };

  const triggerWhatsAppSend = () => {
    if (!shop) return;
    const cleanNum = shop.contactNumber.replace(/[^0-9]/g, '');
    const formattedNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const url = `https://wa.me/${formattedNum}?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-bg p-12 text-center text-xs text-gray-500 font-semibold flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-gold-600" /> Loading shop profile...
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-cream-bg p-8 text-center space-y-4">
        <p className="text-base text-charcoal font-semibold">Shop record not found.</p>
        <Link href="/admin/shops" className="text-xs text-gold-600 font-semibold hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Shop List
        </Link>
      </div>
    );
  }

  const isDueToday = shop.nextFollowUpDate && new Date(shop.nextFollowUpDate).toDateString() === new Date().toDateString();
  const isOverdue = shop.nextFollowUpDate && new Date(shop.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0));
  const avgKgPerOrder = shop.totalOrders > 0 ? Math.round((shop.totalKgPurchased / shop.totalOrders) * 10) / 10 : 0;
  const avgValPerOrder = shop.totalOrders > 0 ? Math.round(shop.totalPurchaseValue / shop.totalOrders) : 0;

  return (
    <div className="min-h-screen bg-cream-bg p-4 sm:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="max-w-6xl mx-auto space-y-4">
        <Link href="/admin/shops" className="text-xs font-semibold text-gold-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop Dashboard
        </Link>

        <div className="glass-panel p-6 rounded-3xl border border-gold-300 shadow-luxury flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">{shop.shopName}</h1>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-gray-500 bg-gold-50 border border-gold-200 rounded-lg">{shop.shopNo}</span>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1 text-gold-600 hover:bg-gold-50 rounded-lg text-xs flex items-center gap-1 border border-gold-200"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <span className="font-semibold text-charcoal flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-gold-600" /> {shop.contactPerson}
              </span>
              <a href={`tel:${shop.contactNumber}`} className="text-gold-700 hover:underline flex items-center gap-1 font-semibold">
                <Phone className="w-3.5 h-3.5" /> {shop.contactNumber}
              </a>
              <span className="flex items-center gap-1 text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {shop.address}, {shop.area}, {shop.city}
              </span>
            </div>

            {shop.assignedSalesExecutiveName && (
              <div className="text-xs text-gold-700 font-semibold bg-gold-50 px-3 py-1 rounded-xl border border-gold-200 inline-flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> Assigned Field Sales: {shop.assignedSalesExecutiveName}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowWhatsAppModal(true);
                setWhatsAppText(`Hi ${shop.contactPerson}, this is Kamadhenu Honey Farms 🐝. Your shop (${shop.shopName}) previously purchased our Pure Raw Honey products. We wanted to check whether you need fresh stock this month. Please let us know your required quantity and we will arrange prompt delivery! 🍯`);
              }}
              className="px-3.5 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp Outreach
            </button>

            <button
              onClick={() => setShowOrderModal(true)}
              className="px-3.5 py-2.5 bg-gold-600 text-white text-xs font-semibold rounded-xl hover:bg-gold-700 transition-colors inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" /> Record New Order
            </button>

            <button
              onClick={() => setShowFollowUpModal(true)}
              className="px-3.5 py-2.5 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" /> Log Follow-up
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Kg Sold</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{shop.totalKgPurchased} <span className="text-xs font-normal">kg</span></p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹{shop.totalPurchaseValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Orders</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{shop.totalOrders}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Avg Order Size</p>
            <p className="text-2xl font-bold text-gold-600 mt-1">{avgKgPerOrder} <span className="text-xs font-normal">kg (₹{avgValPerOrder})</span></p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Reorder Cycle</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{shop.reorderIntervalDays} <span className="text-xs font-normal">days</span></p>
          </div>
          <div className={`glass-panel p-4 rounded-2xl border ${isOverdue ? 'border-rose-400 bg-rose-50/60' : isDueToday ? 'border-amber-400 bg-amber-50/60' : 'border-gold-300'}`}>
            <p className="text-[11px] text-gray-600 font-semibold uppercase">Next Follow-up</p>
            <p className={`text-sm font-bold mt-1.5 ${isOverdue ? 'text-rose-600' : isDueToday ? 'text-amber-600' : 'text-charcoal'}`}>
              {shop.nextFollowUpDate ? new Date(shop.nextFollowUpDate).toLocaleDateString('en-IN') : 'Not set'}
            </p>
            {isOverdue && <span className="text-[10px] text-rose-600 font-bold block">⚠️ OVERDUE</span>}
            {isDueToday && <span className="text-[10px] text-amber-600 font-bold block">🔔 DUE TODAY</span>}
          </div>
        </div>

        {/* Purchase History Table */}
        <div className="glass-panel p-6 rounded-3xl border border-gold-300 space-y-4">
          <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
            <ShoppingBag className="w-5 h-5 text-gold-600" /> Purchase & Order History ({shop.orders?.length || 0})
          </h3>

          {!shop.orders || shop.orders.length === 0 ? (
            <p className="text-xs text-gray-500 italic p-4 text-center">No orders recorded yet for this retail shop.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gold-50/80 text-[11px] font-bold text-gray-600 uppercase border-b border-gold-200">
                    <th className="py-3 px-4">Order No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Quantity / Weight</th>
                    <th className="py-3 px-4">Order Value</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Salesperson</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {shop.orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gold-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-gold-700">{ord.orderNo}</td>
                      <td className="py-3 px-4 text-gray-600">{new Date(ord.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-charcoal">{ord.product}</td>
                      <td className="py-3 px-4 font-bold text-charcoal">{ord.quantity} units ({ord.kg} kg)</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">₹{ord.orderValue.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          ord.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{ord.salesExecutive || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Follow-up History Log */}
        <div className="glass-panel p-6 rounded-3xl border border-gold-300 space-y-4">
          <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
            <Clock className="w-5 h-5 text-amber-600" /> Follow-up Timeline & Interaction Logs ({shop.followUps?.length || 0})
          </h3>

          {!shop.followUps || shop.followUps.length === 0 ? (
            <p className="text-xs text-gray-500 italic p-4 text-center">No follow-up interactions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {shop.followUps.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-gold-200 text-xs space-y-1">
                  <div className="flex justify-between items-center text-gray-500 font-semibold border-b border-gray-100 pb-2 mb-2">
                    <span className="flex items-center gap-1.5 font-bold text-charcoal">
                      <User className="w-3.5 h-3.5 text-gold-600" /> {log.author} ({log.type})
                    </span>
                    <span className="text-[11px] text-gray-400">{new Date(log.date).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-lg border border-gold-200 text-[11px]">
                      Result: {log.result}
                    </span>
                    {log.nextFollowUpDate && (
                      <span className="text-[10px] text-gray-500">
                        Next set: {new Date(log.nextFollowUpDate).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                  {log.notes && <p className="text-gray-700 pt-1 leading-relaxed">{log.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Record Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-charcoal">Record Order for {shop.shopName}</h3>
              <button onClick={() => setShowOrderModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleRecordOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Product *</label>
                <select
                  value={orderForm.product}
                  onChange={(e) => setOrderForm({ ...orderForm, product: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                >
                  <option value="Pure Raw Honey 1kg Jar">Pure Raw Honey 1kg Jar</option>
                  <option value="Pure Raw Honey 500g Jar">Pure Raw Honey 500g Jar</option>
                  <option value="Dry Fruits Honey 1kg Jar">Dry Fruits Honey 1kg Jar</option>
                  <option value="Dry Fruits Honey 500g Jar">Dry Fruits Honey 500g Jar</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantity *</label>
                  <input type="number" required value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value, kg: e.target.value })} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Total Weight (Kg) *</label>
                  <input type="number" required step="0.5" value={orderForm.kg} onChange={(e) => setOrderForm({ ...orderForm, kg: e.target.value })} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Order Value (₹) *</label>
                  <input type="number" required value={orderForm.orderValue} onChange={(e) => setOrderForm({ ...orderForm, orderValue: e.target.value })} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Payment Status</label>
                  <select value={orderForm.paymentStatus} onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value })} className="w-full p-2 border rounded-xl">
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowOrderModal(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" disabled={submittingOrder} className="px-5 py-2 bg-gold-600 text-white rounded-xl font-semibold">
                  {submittingOrder ? 'Recording...' : 'Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-charcoal">Log Follow-up for {shop.shopName}</h3>
              <button onClick={() => setShowFollowUpModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleFollowUpSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Interaction Type</label>
                  <select value={followUpForm.type} onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })} className="w-full p-2 border rounded-xl">
                    <option value="CALL">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="VISIT">Shop Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Result *</label>
                  <select value={followUpForm.result} onChange={(e) => setFollowUpForm({ ...followUpForm, result: e.target.value as any })} className="w-full p-2 border rounded-xl">
                    <option value="NEEDS_STOCK">Needs Stock</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed</option>
                    <option value="DOESNT_NEED_STOCK_NOW">Has Enough Stock</option>
                    <option value="CALL_LATER">Call Later</option>
                    <option value="NO_RESPONSE">No Answer</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes *</label>
                <textarea rows={3} required value={followUpForm.notes} onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" disabled={submittingFollowUp} className="px-5 py-2 bg-amber-600 text-white rounded-xl font-semibold">
                  {submittingFollowUp ? 'Logging...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shop Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-charcoal">Edit Shop Settings</h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-2 border rounded-xl">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="FOLLOW_UP_DUE">FOLLOW_UP_DUE</option>
                  <option value="ORDER_CONFIRMED">ORDER_CONFIRMED</option>
                  <option value="WAITING_FOR_RESPONSE">WAITING_FOR_RESPONSE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Reorder Interval (Days)</label>
                <select value={editForm.reorderIntervalDays} onChange={(e) => setEditForm({ ...editForm, reorderIntervalDays: e.target.value })} className="w-full p-2 border rounded-xl">
                  <option value="15">15 Days</option>
                  <option value="20">20 Days</option>
                  <option value="30">30 Days</option>
                  <option value="45">45 Days</option>
                  <option value="60">60 Days</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-gold-600 text-white rounded-xl font-semibold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-charcoal">Send WhatsApp Message</h3>
              <button onClick={() => setShowWhatsAppModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <textarea rows={4} value={whatsAppText} onChange={(e) => setWhatsAppText(e.target.value)} className="w-full p-3 border rounded-xl text-xs" />
            <div className="pt-3 flex justify-end gap-2 border-t">
              <button type="button" onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="button" onClick={triggerWhatsAppSend} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold inline-flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
