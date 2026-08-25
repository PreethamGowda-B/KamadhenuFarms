'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Users,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Check,
  X,
  FileText,
  User,
  ArrowLeft,
  LayoutDashboard,
  Layers,
  Map,
  BarChart3,
  Flame,
  ShieldCheck
} from 'lucide-react';
import ShopMapView from '@/components/admin/ShopMapView';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalShops: 0,
    newShopsThisMonth: 0,
    activeShops: 0,
    interestedShops: 0,
    ordersConfirmed: 0,
    reorderDue: 0,
    overdueReorders: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalSalesValue: 0,
  });
  const [reordersDueToday, setReordersDueToday] = useState<any[]>([]);
  const [salesExecutives, setSalesExecutives] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: TABLE, MAP, REPORTS
  const [viewMode, setViewMode] = useState<'TABLE' | 'MAP' | 'REPORTS'>('TABLE');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [execFilter, setExecFilter] = useState('ALL');
  const [shopTypeFilter, setShopTypeFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [reorderStatusFilter, setReorderStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalCount: 0, totalPages: 1, limit: 25 });

  // Modals state
  const [showOrderModal, setShowOrderModal] = useState<any | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);
  const [showVisitModal, setShowVisitModal] = useState<any | null>(null);
  const [showReminderModal, setShowReminderModal] = useState<any | null>(null);

  // Form states
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

  const [reminderActionLoading, setReminderActionLoading] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    fetchShops();
    fetchReordersDue();
    fetchSalesExecutives();
    fetchReports();
  }, [search, statusFilter, cityFilter, execFilter, shopTypeFilter, paymentStatusFilter, reorderStatusFilter, page]);

  async function fetchShops() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        city: cityFilter,
        shopType: shopTypeFilter,
        salespersonId: execFilter,
        paymentStatus: paymentStatusFilter,
        reorderStatus: reorderStatusFilter,
        page: String(page),
        limit: '25',
      });

      const res = await fetch(`/api/shops?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setShops(data.shops || []);
        setPagination(data.pagination || { page: 1, totalCount: 0, totalPages: 1, limit: 25 });
      }
    } catch (e) {
      console.error('Failed to fetch shops:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReordersDue() {
    try {
      const res = await fetch('/api/shops/reorders/due?filter=DUE_TODAY');
      const data = await res.json();
      if (data.success) {
        setReordersDueToday(data.shops || []);
      }
    } catch (e) {}
  }

  async function fetchSalesExecutives() {
    try {
      const res = await fetch('/api/admin/applications?status=HIRED&limit=100');
      const data = await res.json();
      if (data.success && data.applications) {
        setSalesExecutives(data.applications);
      }
    } catch (e) {}
  }

  async function fetchReports() {
    try {
      const res = await fetch('/api/admin/shops/reports');
      const data = await res.json();
      if (data.success) {
        setReportsData(data);
        const s = data.summary;
        setMetrics((prev: any) => ({
          ...prev,
          totalShops: s.totalShops || 0,
          totalSalesValue: s.totalSalesValue || 0,
          pendingPayments: s.totalOutstanding || 0,
        }));
      }
    } catch (e) {}
  }

  // Quick Action: Handle Reorder Snooze or Mark Contacted
  const handleReminderAction = async (shopId: string, reminderId: string, action: 'MARK_CONTACTED' | 'SNOOZE') => {
    try {
      setReminderActionLoading(`${shopId}-${action}`);
      const res = await fetch(`/api/shops/${shopId}/reminders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, action, snoozeDays: 3 }),
      });
      if (res.ok) {
        fetchReordersDue();
        fetchShops();
      }
    } catch (e) {
      alert('Failed to update reminder');
    } finally {
      setReminderActionLoading(null);
    }
  };

  // Submit Order Modal
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOrderModal) return;
    try {
      setSubmittingOrder(true);
      const res = await fetch(`/api/shops/${showOrderModal.id}/orders`, {
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
        setShowOrderModal(null);
        fetchShops();
        fetchReordersDue();
      } else {
        alert(data.message || 'Failed to create order');
      }
    } catch (e) {
      alert('Error creating order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Submit Payment Modal
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/shops/${showPaymentModal.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(null);
        setPaymentForm({ amount: '', paymentMethod: 'CASH', reference: '', notes: '' });
        fetchShops();
      } else {
        alert(data.message || 'Failed to record payment');
      }
    } catch (e) {
      alert('Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit Visit Modal
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showVisitModal) return;
    try {
      setSubmittingVisit(true);
      const res = await fetch(`/api/shops/${showVisitModal.id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowVisitModal(null);
        setVisitForm({ purpose: 'ROUTINE_FOLLOW_UP', discussion: '', orderTaken: false, paymentCollected: 0, nextFollowUpDate: '', notes: '' });
        fetchShops();
      } else {
        alert(data.message || 'Failed to log visit');
      }
    } catch (e) {
      alert('Error logging visit');
    } finally {
      setSubmittingVisit(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Admin CRM Top Navigation */}
      <header className="bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/recruitment"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              title="Back to Recruitment Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-xl tracking-wide">
                  Shop Management & Reorder Reminder CRM
                </h1>
                <span className="bg-amber-400 text-amber-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Kamadhenu Honey Farms • Physical Shop Network & Forecasting Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/shop-form"
              target="_blank"
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              Onboard Shop Form
            </Link>
          </div>
        </div>
      </header>

      {/* Main CRM Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* 10 DASHBOARD KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">1. Total Shops</span>
            <span className="text-2xl font-serif font-bold text-stone-900">{reportsData?.summary?.totalShops || shops.length}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">2. New Shops</span>
            <span className="text-2xl font-serif font-bold text-amber-700">{reportsData?.summary?.totalShops || 0}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">3. Active Shops</span>
            <span className="text-2xl font-serif font-bold text-emerald-700">{reportsData?.summary?.repeatShops || 0}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">4. Repeat Reorder Rate</span>
            <span className="text-2xl font-serif font-bold text-purple-700">{reportsData?.summary?.reorderRate || '0%'}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">5. Total Orders</span>
            <span className="text-2xl font-serif font-bold text-stone-900">{reportsData?.summary?.totalOrders || 0}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-300 shadow-sm bg-amber-50/40">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">6. Reorders Due Today</span>
            <span className="text-2xl font-serif font-bold text-amber-950">{reordersDueToday.length}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-300 shadow-sm bg-rose-50/40">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">7. Overdue Reorders</span>
            <span className="text-2xl font-serif font-bold text-rose-900">{reportsData?.atRiskShops?.length || 0}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">8. Pending Credit (₹)</span>
            <span className="text-xl font-serif font-bold text-rose-700">₹{(reportsData?.summary?.totalOutstanding || 0).toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">9. Collected Payments</span>
            <span className="text-xl font-serif font-bold text-emerald-700">₹{(reportsData?.summary?.totalCollected || 0).toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-400 shadow-sm bg-gradient-to-br from-amber-100/50 to-orange-100/40">
            <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">10. Total Shop Sales</span>
            <span className="text-xl font-serif font-bold text-amber-950">₹{(reportsData?.summary?.totalSalesValue || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* CORE CRM SECTION: REORDERS DUE TODAY */}
        {reordersDueToday.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-400 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-950">
                <Flame className="w-5 h-5 text-amber-700 fill-amber-500 animate-pulse" />
                <h2 className="font-serif font-bold text-base">
                  Reorders Due Today ({reordersDueToday.length} Shops)
                </h2>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full">
                Action Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reordersDueToday.map((shop: any) => (
                <div key={shop.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {shop.shopCode}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900 mt-1">{shop.shopName}</h4>
                      <p className="text-xs text-stone-500">{shop.ownerName} • {shop.area}, {shop.city}</p>
                    </div>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Due Today
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 bg-amber-50/60 p-2 rounded-lg flex justify-between">
                    <span>Est. Reorder: <strong>{shop.estimatedMonthlyKg || 10} kg</strong></span>
                    <span>Executive: <strong>{shop.salespersonSnapshotName || 'Field Agent'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <a
                      href={`tel:${shop.mobile}`}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    <a
                      href={`https://wa.me/91${(shop.whatsapp || shop.mobile).replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(shop.shopName)},%20this%20is%20Kamadhenu%20Honey%20Farms.%20Your%20next%20pure%20honey%20stock%20reorder%20is%20due.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1 border border-emerald-300"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                    <button
                      onClick={() => setShowOrderModal(shop)}
                      className="flex-1 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold text-center"
                    >
                      Order
                    </button>
                    <button
                      onClick={() => handleReminderAction(shop.id, shop.reminders?.[0]?.id || '1', 'MARK_CONTACTED')}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700"
                      title="Mark as Contacted"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW MODE SWITCHER */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'TABLE' ? 'bg-amber-800 text-white shadow' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Shop Management Table
            </button>

            <button
              onClick={() => setViewMode('MAP')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'MAP' ? 'bg-amber-800 text-white shadow' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Map className="w-4 h-4" />
              📍 Salesperson → Shop Territory Map
            </button>

            <button
              onClick={() => setViewMode('REPORTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === 'REPORTS' ? 'bg-amber-800 text-white shadow' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              CRM Reports & Analytics
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* VIEW 1: SHOP MANAGEMENT TABLE */}
        {/* ==================================================== */}
        {viewMode === 'TABLE' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search Shop Name, Owner, Mobile, Shop Code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <select
                  value={execFilter}
                  onChange={(e) => setExecFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Sales Executives</option>
                  {salesExecutives.map((exec) => (
                    <option key={exec.id} value={exec.id}>{exec.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ORDER_CONFIRMED">Order Confirmed</option>
                  <option value="FOLLOW_UP_DUE">Follow-up Due</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div>
                <select
                  value={reorderStatusFilter}
                  onChange={(e) => setReorderStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Reorder Schedules</option>
                  <option value="DUE_TODAY">Reorder Due Today</option>
                  <option value="DUE_SOON">Due in 3 Days</option>
                  <option value="OVERDUE">Overdue Reorder</option>
                </select>
              </div>

              <div>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="PENDING">Has Outstanding Balance</option>
                  <option value="OVERDUE">Overdue Credit Payment</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/70 text-stone-700 uppercase font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3.5">Shop Code & Name</th>
                      <th className="p-3.5">Owner & Mobile</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Salesperson</th>
                      <th className="p-3.5">Total Sales</th>
                      <th className="p-3.5">Next Reorder</th>
                      <th className="p-3.5">Credit Balance</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-stone-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-700" />
                          Loading Shops…
                        </td>
                      </tr>
                    ) : shops.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-stone-500">
                          No shops match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      shops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-amber-50/30 transition">
                          <td className="p-3.5 font-bold">
                            <Link
                              href={`/admin/shops/${shop.id}`}
                              className="text-amber-900 hover:underline block"
                            >
                              {shop.shopName}
                            </Link>
                            <span className="font-mono text-[10px] text-stone-400">{shop.shopCode}</span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-stone-900">{shop.ownerName || shop.contactPerson}</div>
                            <a href={`tel:${shop.mobile}`} className="text-stone-500 hover:text-amber-800">
                              {shop.mobile}
                            </a>
                          </td>
                          <td className="p-3.5 text-stone-600">
                            {shop.area}, {shop.city}
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-stone-800">
                              {shop.salesperson?.fullName || shop.salespersonSnapshotName || 'Unassigned'}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-stone-900">
                            ₹{shop.totalPurchaseValue?.toLocaleString('en-IN') || 0}
                            <span className="block font-normal text-[10px] text-stone-400">
                              {shop.totalOrders || 0} orders ({shop.totalKgPurchased || 0} kg)
                            </span>
                          </td>
                          <td className="p-3.5 font-medium">
                            {shop.nextReorderDate ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                new Date(shop.nextReorderDate) < new Date()
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {new Date(shop.nextReorderDate).toLocaleDateString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {shop.outstandingAmount > 0 ? (
                              <span className="text-rose-700 font-bold">
                                ₹{shop.outstandingAmount.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Cleared</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {shop.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => setShowOrderModal(shop)}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg"
                              title="Add Order"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowPaymentModal(shop)}
                              className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg"
                              title="Record Payment"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowVisitModal(shop)}
                              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg"
                              title="Log Visit"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/admin/shops/${shop.id}`}
                              className="p-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg inline-block"
                              title="View Full 360 Profile"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                <span>Total {pagination.totalCount} shops</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-stone-800">Page {page} of {pagination.totalPages}</span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: 📍 SALESPERSON → SHOP TERRITORY MAP */}
        {/* ==================================================== */}
        {viewMode === 'MAP' && (
          <ShopMapView salesExecutives={salesExecutives} />
        )}

        {/* ==================================================== */}
        {/* VIEW 3: CRM REPORTS & ANALYTICS */}
        {/* ==================================================== */}
        {viewMode === 'REPORTS' && reportsData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Salesperson */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="font-serif font-bold text-base text-stone-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  Sales Performance by Salesperson
                </h3>
                <div className="space-y-3">
                  {reportsData.salesBySalesperson?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm text-stone-900">{item.salesperson}</span>
                        <span className="block text-[11px] text-stone-500">{item.shopsCount} Shops • {item.totalKg} kg delivered</span>
                      </div>
                      <span className="font-serif font-bold text-base text-emerald-800">
                        ₹{item.totalSales.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales by Product */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="font-serif font-bold text-base text-stone-900 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-700" />
                  Product Sales Volume Breakdown
                </h3>
                <div className="space-y-3">
                  {reportsData.productBreakdown?.map((p: any, idx: number) => (
                    <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm text-stone-900">{p.productName}</span>
                        <span className="block text-[11px] text-stone-500">{p.quantity} jars sold ({p.totalKg} kg)</span>
                      </div>
                      <span className="font-serif font-bold text-base text-amber-950">
                        ₹{p.salesValue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Shops Leaderboard */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-3">
                🏆 Top Performing Shops
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 text-stone-700 uppercase font-bold">
                    <tr>
                      <th className="p-3">Shop Code</th>
                      <th className="p-3">Shop Name</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Orders</th>
                      <th className="p-3">Total Kg</th>
                      <th className="p-3 text-right">Total Purchase Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {reportsData.topShops?.map((s: any) => (
                      <tr key={s.id}>
                        <td className="p-3 font-mono font-bold text-amber-900">{s.shopCode}</td>
                        <td className="p-3 font-bold text-stone-900">{s.shopName}</td>
                        <td className="p-3 text-stone-600">{s.area}, {s.city}</td>
                        <td className="p-3">{s.totalOrders}</td>
                        <td className="p-3">{s.totalKgPurchased} kg</td>
                        <td className="p-3 text-right font-serif font-bold text-emerald-800">₹{s.totalPurchaseValue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: ADD ORDER */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">Record Shop Order</h3>
                <p className="text-xs text-stone-500">{showOrderModal.shopName} ({showOrderModal.shopCode})</p>
              </div>
              <button onClick={() => setShowOrderModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
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
                <span className="font-bold text-emerald-900">Total Order Amount</span>
                <span className="text-base font-serif font-bold text-emerald-950">
                  ₹{(orderForm.quantity * orderForm.unitPrice).toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow transition"
              >
                {submittingOrder ? 'Recording Order…' : 'Confirm & Schedule Reorder'}
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
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">Record Payment</h3>
                <p className="text-xs text-stone-500">Outstanding: ₹{showPaymentModal.outstandingAmount?.toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Method</label>
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
                  placeholder="UPI transaction ref or UTR"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submittingPayment}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow transition"
              >
                {submittingPayment ? 'Saving…' : 'Record Payment in Ledger'}
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
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">Log Physical Visit</h3>
                <p className="text-xs text-stone-500">{showVisitModal.shopName}</p>
              </div>
              <button onClick={() => setShowVisitModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVisit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Purpose of Visit</label>
                <select
                  value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold bg-white"
                >
                  <option value="ROUTINE_FOLLOW_UP">Routine Follow-up</option>
                  <option value="REORDER_VISIT">Reorder Delivery / Visit</option>
                  <option value="PAYMENT_COLLECTION">Payment Collection</option>
                  <option value="SAMPLE_DROP">Sample Drop</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Discussion Details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Key discussion points, feedback on honey stock..."
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
                {submittingVisit ? 'Saving…' : 'Save Visit Record'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
