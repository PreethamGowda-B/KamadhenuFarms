'use client';

import { useState, useEffect } from 'react';
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
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Send, 
  RefreshCw, 
  ExternalLink,
  Tag,
  DollarSign,
  TrendingUp,
  UserCheck,
  Building,
  Check,
  X,
  FileText,
  User,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { ShopRecord } from '@/lib/store';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [metrics, setMetrics] = useState<any>({
    activeShops: 0,
    followUpsDue: 0,
    overdue: 0,
    ordersThisMonth: 0,
    kgSoldThisMonth: 0,
    repeatCustomers: 0,
    totalKgSold: 0,
  });
  const [salesExecutives, setSalesExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [activeTab, setActiveTab] = useState<'ALL_SHOPS' | 'FOLLOW_UPS' | 'MY_SHOPS'>('ALL_SHOPS');
  const [followUpSubFilter, setFollowUpSubFilter] = useState<'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'WAITING' | 'CONFIRMED'>('DUE_TODAY');
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [execFilter, setExecFilter] = useState('ALL');
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalCount: 0, totalPages: 1, limit: 20 });

  // Modals state
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState<ShopRecord | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState<ShopRecord | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<ShopRecord | null>(null);

  // Form states
  const [addShopForm, setAddShopForm] = useState({
    shopName: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    address: '',
    area: '',
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '',
    assignedSalesExecutiveId: '',
    assignedSalesExecutiveName: '',
    reorderIntervalDays: '30',
    notes: '',
  });
  const [submittingShop, setSubmittingShop] = useState(false);

  const [orderForm, setOrderForm] = useState({
    product: 'Pure Raw Honey 1kg',
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

  const [whatsAppText, setWhatsAppText] = useState('');

  useEffect(() => {
    fetchShops();
  }, [page, search, statusFilter, cityFilter, execFilter, activeTab, followUpSubFilter]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', '20');
      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (cityFilter !== 'ALL') queryParams.set('city', cityFilter);
      if (execFilter !== 'ALL') queryParams.set('salesExecutiveId', execFilter);

      if (activeTab === 'FOLLOW_UPS') {
        queryParams.set('followUpFilter', followUpSubFilter);
      }

      const res = await fetch(`/api/admin/shops?${queryParams.toString()}`);
      const json = await res.json();

      if (json.success) {
        setShops(json.data || []);
        if (json.metrics) setMetrics(json.metrics);
        if (json.pagination) setPagination(json.pagination);
        if (json.salesExecutives) setSalesExecutives(json.salesExecutives);
      }
    } catch (e) {
      console.error('Failed to load shops:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addShopForm.shopName.trim() || !addShopForm.contactPerson.trim() || !addShopForm.contactNumber.trim()) {
      alert('Please fill out all required shop details (Name, Contact Person, Phone Number)');
      return;
    }

    setSubmittingShop(true);
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addShopForm),
      });

      const json = await res.json();
      if (json.success) {
        alert('Shop created successfully!');
        setShowAddShopModal(false);
        setAddShopForm({
          shopName: '',
          contactPerson: '',
          contactNumber: '',
          email: '',
          address: '',
          area: '',
          city: 'Bangalore',
          state: 'Karnataka',
          pinCode: '',
          assignedSalesExecutiveId: '',
          assignedSalesExecutiveName: '',
          reorderIntervalDays: '30',
          notes: '',
        });
        fetchShops();
      } else {
        alert(`Error: ${json.message}`);
      }
    } catch (e) {
      alert('Failed to save shop');
    } finally {
      setSubmittingShop(false);
    }
  };

  const handleRecordOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOrderModal) return;

    setSubmittingOrder(true);
    try {
      const res = await fetch(`/api/admin/shops/${showOrderModal.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Order recorded! Next follow-up date set to ${new Date(json.shop.nextFollowUpDate).toLocaleDateString('en-IN')}`);
        setShowOrderModal(null);
        fetchShops();
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
    if (!showFollowUpModal) return;

    setSubmittingFollowUp(true);
    try {
      const res = await fetch(`/api/admin/shops/${showFollowUpModal.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm),
      });

      const json = await res.json();
      if (json.success) {
        alert('Follow-up logged successfully!');
        setShowFollowUpModal(null);
        fetchShops();
      } else {
        alert(`Error: ${json.message}`);
      }
    } catch (e) {
      alert('Failed to log follow-up');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const openWhatsAppDrawer = (shop: ShopRecord) => {
    setShowWhatsAppModal(shop);
    const msg = `Hi ${shop.contactPerson}, this is Kamadhenu Honey Farms 🐝. Your shop (${shop.shopName}) previously purchased our Pure Raw Honey products. We wanted to check whether you need fresh stock this month. Please let us know your required quantity and we will arrange prompt delivery! 🍯`;
    setWhatsAppText(msg);
  };

  const triggerWhatsAppSend = () => {
    if (!showWhatsAppModal) return;
    const cleanNum = showWhatsAppModal.contactNumber.replace(/[^0-9]/g, '');
    const formattedNum = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    const url = `https://wa.me/${formattedNum}?text=${encodeURIComponent(whatsAppText)}`;
    window.open(url, '_blank');
    setShowWhatsAppModal(null);
  };

  const snoozeShop = async (shopId: string, days: number) => {
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozeDays: days }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Follow-up snoozed for ${days} days.`);
        fetchShops();
      }
    } catch (e) {
      alert('Failed to snooze reminder');
    }
  };

  // Helper formatting status badges
  const renderStatusBadge = (s: string) => {
    switch (s) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">Active Retailer</span>;
      case 'FOLLOW_UP_DUE':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200 animate-pulse">🔔 Follow-up Due</span>;
      case 'ORDER_CONFIRMED':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200">✨ Order Confirmed</span>;
      case 'WAITING_FOR_RESPONSE':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 rounded-full border border-purple-200">⏳ Awaiting Reply</span>;
      case 'INACTIVE':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-full border border-gray-200">Inactive</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-200">Closed</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-gray-50 rounded-full border">{s}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg p-4 sm:p-8 space-y-6">
      
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gold-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-gold-600 font-semibold mb-1">
            <Link href="/admin/recruitment" className="hover:underline">Recruitment Admin</Link>
            <span>/</span>
            <span className="text-charcoal font-bold">Shop Management CRM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal flex items-center gap-2">
            <Store className="w-7 h-7 text-gold-600" /> Shop Management & Reorder Reminder CRM
          </h1>
          <p className="text-xs text-gray-600 mt-1">Track retail shops, automated reorder cycles, field sales orders, and repeat honey purchases.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/recruitment"
            className="px-4 py-2.5 bg-white text-gray-700 hover:text-charcoal text-xs font-semibold rounded-xl border border-gold-300 hover:bg-gold-50 shadow-sm transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-gold-600" /> Back to Admin Portal
          </Link>

          <button
            onClick={() => setShowAddShopModal(true)}
            className="px-4 py-2.5 bg-gold-600 text-white text-xs font-semibold rounded-xl hover:bg-gold-700 shadow-luxury transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Retail Shop
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Active Shops</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{metrics.activeShops}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-amber-300 bg-amber-50/50">
            <p className="text-[11px] text-amber-800 font-semibold uppercase tracking-wider">Due Today 🔔</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.followUpsDue}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-300 bg-rose-50/50">
            <p className="text-[11px] text-rose-800 font-semibold uppercase tracking-wider">Overdue</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.overdue}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Orders This Month</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.ordersThisMonth}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Kg Sold (Month)</p>
            <p className="text-2xl font-bold text-gold-600 mt-1">{metrics.kgSoldThisMonth} <span className="text-xs font-normal">kg</span></p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-gold-300">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Repeat Retailers</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.repeatCustomers}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gold-200 overflow-x-auto gap-2">
          <button
            onClick={() => { setActiveTab('ALL_SHOPS'); setPage(1); }}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ALL_SHOPS'
                ? 'border-gold-600 text-gold-600 bg-gold-50/60 rounded-t-xl'
                : 'border-transparent text-gray-600 hover:text-charcoal'
            }`}
          >
            <Store className="w-4 h-4" /> All Retail Shops ({pagination.totalCount})
          </button>

          <button
            onClick={() => { setActiveTab('FOLLOW_UPS'); setPage(1); }}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'FOLLOW_UPS'
                ? 'border-gold-600 text-gold-600 bg-gold-50/60 rounded-t-xl'
                : 'border-transparent text-gray-600 hover:text-charcoal'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" /> 🔔 Stock Follow-ups Hub
          </button>

          <button
            onClick={() => { setActiveTab('MY_SHOPS'); setPage(1); }}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'MY_SHOPS'
                ? 'border-gold-600 text-gold-600 bg-gold-50/60 rounded-t-xl'
                : 'border-transparent text-gray-600 hover:text-charcoal'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" /> My Assigned Shops
          </button>
        </div>

        {/* Follow-up Sub-filter Bar (When Follow-ups Hub tab is active) */}
        {activeTab === 'FOLLOW_UPS' && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs font-semibold">
            <span className="text-amber-900 font-bold flex items-center gap-1 mr-2">
              <Filter className="w-3.5 h-3.5" /> Follow-up Category:
            </span>
            <button
              onClick={() => { setFollowUpSubFilter('DUE_TODAY'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                followUpSubFilter === 'DUE_TODAY' ? 'bg-amber-600 text-white font-bold' : 'bg-white text-amber-900 border hover:bg-amber-100'
              }`}
            >
              🔔 Due Today ({metrics.followUpsDue})
            </button>
            <button
              onClick={() => { setFollowUpSubFilter('OVERDUE'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                followUpSubFilter === 'OVERDUE' ? 'bg-rose-600 text-white font-bold' : 'bg-white text-rose-900 border hover:bg-rose-100'
              }`}
            >
              🚨 Overdue ({metrics.overdue})
            </button>
            <button
              onClick={() => { setFollowUpSubFilter('UPCOMING'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                followUpSubFilter === 'UPCOMING' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-blue-900 border hover:bg-blue-100'
              }`}
            >
              📅 Upcoming
            </button>
            <button
              onClick={() => { setFollowUpSubFilter('WAITING'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                followUpSubFilter === 'WAITING' ? 'bg-purple-600 text-white font-bold' : 'bg-white text-purple-900 border hover:bg-purple-100'
              }`}
            >
              ⏳ Awaiting Reply
            </button>
            <button
              onClick={() => { setFollowUpSubFilter('CONFIRMED'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                followUpSubFilter === 'CONFIRMED' ? 'bg-emerald-600 text-white font-bold' : 'bg-white text-emerald-900 border hover:bg-emerald-100'
              }`}
            >
              ✨ Order Confirmed
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-gold-300 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by shop name, contact person, phone, area, city..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gold-200 bg-white outline-none focus:border-gold-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs rounded-xl border border-gold-200 bg-white outline-none focus:border-gold-500 font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="FOLLOW_UP_DUE">Follow-up Due</option>
              <option value="ORDER_CONFIRMED">Order Confirmed</option>
              <option value="WAITING_FOR_RESPONSE">Awaiting Reply</option>
              <option value="INACTIVE">Inactive</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={execFilter}
              onChange={(e) => { setExecFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs rounded-xl border border-gold-200 bg-white outline-none focus:border-gold-500 font-semibold"
            >
              <option value="ALL">All Sales Executives</option>
              {salesExecutives.map((exec) => (
                <option key={exec.id} value={exec.id}>{exec.fullName} ({exec.city})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shop List Table / Cards View */}
        <div className="glass-panel rounded-3xl border border-gold-300 overflow-hidden shadow-luxury">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500 font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-gold-600" /> Loading shop records...
            </div>
          ) : shops.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Store className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-charcoal">No retail shops match your search criteria</p>
              <button
                onClick={() => setShowAddShopModal(true)}
                className="px-4 py-2 bg-gold-600 text-white text-xs font-semibold rounded-xl hover:bg-gold-700 inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add First Retail Shop
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gold-50/80 text-[11px] font-bold text-gray-600 uppercase border-b border-gold-200">
                    <th className="py-3.5 px-4">Shop Details</th>
                    <th className="py-3.5 px-4">Contact & Location</th>
                    <th className="py-3.5 px-4">Sales Executive</th>
                    <th className="py-3.5 px-4">Order Metrics</th>
                    <th className="py-3.5 px-4">Next Follow-up</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100 text-xs">
                  {shops.map((shop) => {
                    const isDueToday = shop.nextFollowUpDate && new Date(shop.nextFollowUpDate).toDateString() === new Date().toDateString();
                    const isOverdue = shop.nextFollowUpDate && new Date(shop.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0));

                    return (
                      <tr key={shop.id} className="hover:bg-gold-50/40 transition-colors">
                        
                        {/* Shop Details */}
                        <td className="py-4 px-4 space-y-1">
                          <Link href={`/admin/shops/${shop.id}`} className="font-serif font-bold text-sm text-charcoal hover:text-gold-600 block">
                            {shop.shopName}
                          </Link>
                          <span className="text-[10px] font-mono text-gray-400 block">{shop.shopNo} • Cycle: {shop.reorderIntervalDays}d</span>
                        </td>

                        {/* Contact & Location */}
                        <td className="py-4 px-4 space-y-1">
                          <p className="font-semibold text-charcoal">{shop.contactPerson}</p>
                          <p className="text-[11px] text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gold-600" /> {shop.contactNumber}
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" /> {shop.area}, {shop.city}
                          </p>
                        </td>

                        {/* Sales Executive */}
                        <td className="py-4 px-4">
                          {shop.assignedSalesExecutiveName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-700 bg-gold-50 px-2 py-1 rounded-lg border border-gold-200">
                              <UserCheck className="w-3 h-3 text-gold-600" /> {shop.assignedSalesExecutiveName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Order Metrics */}
                        <td className="py-4 px-4 space-y-1">
                          <p className="font-bold text-charcoal">{shop.totalKgPurchased} <span className="text-[10px] font-normal text-gray-500">kg total</span></p>
                          <p className="text-[11px] text-emerald-600 font-semibold">₹{shop.totalPurchaseValue.toLocaleString('en-IN')}</p>
                          <span className="text-[10px] text-gray-500 block">{shop.totalOrders} order(s)</span>
                        </td>

                        {/* Next Follow-up Date */}
                        <td className="py-4 px-4 space-y-1">
                          {shop.nextFollowUpDate ? (
                            <div className="flex flex-col">
                              <span className={`font-semibold text-xs ${isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-600 font-bold' : 'text-charcoal'}`}>
                                {new Date(shop.nextFollowUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              {isOverdue && <span className="text-[10px] text-rose-600 font-bold">⚠️ OVERDUE</span>}
                              {isDueToday && <span className="text-[10px] text-amber-600 font-bold">🔔 DUE TODAY</span>}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Not set</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {renderStatusBadge(shop.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* WhatsApp Direct */}
                          <button
                            onClick={() => openWhatsAppDrawer(shop)}
                            title="Send WhatsApp Follow-up Message"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors inline-flex items-center"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Record Order */}
                          <button
                            onClick={() => {
                              setShowOrderModal(shop);
                              setOrderForm({
                                product: 'Pure Raw Honey 1kg',
                                quantity: '10',
                                kg: '10',
                                orderValue: '7490',
                                paymentStatus: 'PAID',
                                deliveryStatus: 'DELIVERED',
                                salesExecutive: shop.assignedSalesExecutiveName || '',
                                orderDate: new Date().toISOString().split('T')[0],
                                notes: '',
                              });
                            }}
                            title="Record New Order"
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors inline-flex items-center"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>

                          {/* Record Follow-up */}
                          <button
                            onClick={() => {
                              setShowFollowUpModal(shop);
                              setFollowUpForm({
                                author: 'Admin User',
                                type: 'CALL',
                                result: 'NEEDS_STOCK',
                                notes: '',
                                nextFollowUpDate: '',
                              });
                            }}
                            title="Log Follow-up Interaction"
                            className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors inline-flex items-center"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* View Profile */}
                          <Link
                            href={`/admin/shops/${shop.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold text-gold-700 bg-gold-50 hover:bg-gold-100 rounded-lg border border-gold-200 transition-colors inline-flex items-center gap-1"
                          >
                            Profile <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-4 bg-gold-50/50 border-t border-gold-200 flex items-center justify-between text-xs text-gray-600">
            <span>Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} shops)</span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gold-300 bg-white font-semibold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gold-300 bg-white font-semibold disabled:opacity-50 inline-flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================================================
          MODAL 1: Add New Retail Shop
         ========================================================================== */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gold-200 pb-4">
              <h2 className="text-xl font-serif font-bold text-charcoal flex items-center gap-2">
                <Store className="w-5 h-5 text-gold-600" /> Add New Retail Shop
              </h2>
              <button onClick={() => setShowAddShopModal(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShopSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Shop Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Lakshmi Organics"
                    value={addShopForm.shopName}
                    onChange={(e) => setAddShopForm({ ...addShopForm, shopName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={addShopForm.contactPerson}
                    onChange={(e) => setAddShopForm({ ...addShopForm, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={addShopForm.contactNumber}
                    onChange={(e) => setAddShopForm({ ...addShopForm, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. shop@gmail.com"
                    value={addShopForm.email}
                    onChange={(e) => setAddShopForm({ ...addShopForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Shop Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. No. 45, Main Road, opposite City Bank"
                    value={addShopForm.address}
                    onChange={(e) => setAddShopForm({ ...addShopForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Area / Suburb *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajajinagar"
                    value={addShopForm.area}
                    onChange={(e) => setAddShopForm({ ...addShopForm, area: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore"
                    value={addShopForm.city}
                    onChange={(e) => setAddShopForm({ ...addShopForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Sales Executive</label>
                  <select
                    value={addShopForm.assignedSalesExecutiveId}
                    onChange={(e) => {
                      const selected = salesExecutives.find((x) => x.id === e.target.value);
                      setAddShopForm({
                        ...addShopForm,
                        assignedSalesExecutiveId: e.target.value,
                        assignedSalesExecutiveName: selected ? selected.fullName : '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold"
                  >
                    <option value="">None (Unassigned)</option>
                    {salesExecutives.map((exec) => (
                      <option key={exec.id} value={exec.id}>{exec.fullName} ({exec.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reorder Interval (Days) *</label>
                  <select
                    value={addShopForm.reorderIntervalDays}
                    onChange={(e) => setAddShopForm({ ...addShopForm, reorderIntervalDays: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold"
                  >
                    <option value="15">Every 15 Days (High Demand)</option>
                    <option value="20">Every 20 Days</option>
                    <option value="30">Every 30 Days (Monthly Standard)</option>
                    <option value="45">Every 45 Days</option>
                    <option value="60">Every 60 Days</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Notes / Preferences</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Prefers 1kg Raw Honey jars, calls best in the evening..."
                    value={addShopForm.notes}
                    onChange={(e) => setAddShopForm({ ...addShopForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setShowAddShopModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingShop}
                  className="px-5 py-2.5 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 disabled:opacity-50"
                >
                  {submittingShop ? 'Saving Shop...' : 'Save & Register Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 2: Record New Order
         ========================================================================== */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gold-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-charcoal flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-gold-600" /> Record New Order
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{showOrderModal.shopName} ({showOrderModal.shopNo})</p>
              </div>
              <button onClick={() => setShowOrderModal(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Product Purchased *</label>
                <select
                  value={orderForm.product}
                  onChange={(e) => setOrderForm({ ...orderForm, product: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold"
                >
                  <option value="Pure Raw Honey 1kg Jar">Pure Raw Honey 1kg Jar</option>
                  <option value="Pure Raw Honey 500g Jar">Pure Raw Honey 500g Jar</option>
                  <option value="Dry Fruits Honey 1kg Jar">Dry Fruits Honey 1kg Jar</option>
                  <option value="Dry Fruits Honey 500g Jar">Dry Fruits Honey 500g Jar</option>
                  <option value="Bee-Crafted Honey Comb Jar">Bee-Crafted Honey Comb Jar</option>
                  <option value="Mixed Honey Bulk Assortment">Mixed Honey Bulk Assortment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Quantity (Units/Jars) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value, kg: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Total Weight (Kg) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0.5"
                    value={orderForm.kg}
                    onChange={(e) => setOrderForm({ ...orderForm, kg: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Total Order Value (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={orderForm.orderValue}
                    onChange={(e) => setOrderForm({ ...orderForm, orderValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Status</label>
                  <select
                    value={orderForm.paymentStatus}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentStatus: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold"
                  >
                    <option value="PAID">PAID (Full Payment)</option>
                    <option value="PENDING">PENDING (Credit)</option>
                    <option value="PARTIAL">PARTIAL PAYMENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Sales Executive Who Took Order</label>
                <input
                  type="text"
                  placeholder="e.g. Preetham Gowda"
                  value={orderForm.salesExecutive}
                  onChange={(e) => setOrderForm({ ...orderForm, salesExecutive: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderForm.orderDate}
                  onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                />
              </div>

              <div className="p-3 bg-gold-50/80 rounded-xl border border-gold-200 text-[11px] text-gray-700">
                ⚡ <strong>Automated Engine:</strong> Saving this order will set the shop's next follow-up date to <strong>{showOrderModal.reorderIntervalDays} days</strong> from order date.
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-5 py-2.5 bg-gold-600 text-white rounded-xl font-semibold hover:bg-gold-700 disabled:opacity-50"
                >
                  {submittingOrder ? 'Recording Order...' : 'Confirm & Record Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 3: Record Follow-Up Interaction
         ========================================================================== */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gold-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-charcoal flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Log Follow-up Interaction
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{showFollowUpModal.shopName} ({showFollowUpModal.contactNumber})</p>
              </div>
              <button onClick={() => setShowFollowUpModal(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFollowUpSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Follow-up Type</label>
                  <select
                    value={followUpForm.type}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold"
                  >
                    <option value="CALL">Phone Call 📞</option>
                    <option value="WHATSAPP">WhatsApp Message 💬</option>
                    <option value="VISIT">In-Person Shop Visit 🏪</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Interaction Result *</label>
                  <select
                    value={followUpForm.result}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, result: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500 font-semibold text-gold-700"
                  >
                    <option value="NEEDS_STOCK">Needs Stock (Wants to Order)</option>
                    <option value="ORDER_CONFIRMED">Order Confirmed</option>
                    <option value="DOESNT_NEED_STOCK_NOW">Has Enough Stock Right Now</option>
                    <option value="CALL_LATER">Call Later (Snooze 3 Days)</option>
                    <option value="NO_RESPONSE">No Answer / Did Not Reply</option>
                    <option value="NOT_INTERESTED">Not Interested Anymore</option>
                    <option value="SHOP_CLOSED">Shop Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Custom Next Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Follow-up Notes / Remarks</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record customer response or stock notes..."
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold-300 bg-white outline-none focus:border-gold-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {submittingFollowUp ? 'Logging...' : 'Log Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL 4: WhatsApp prepared Message Drawer
         ========================================================================== */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gold-300 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-gold-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-charcoal flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" /> Send WhatsApp Follow-up
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{showWhatsAppModal.shopName} ({showWhatsAppModal.contactNumber})</p>
              </div>
              <button onClick={() => setShowWhatsAppModal(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Pre-filled Message Preview (Editable):</label>
                <textarea
                  rows={5}
                  value={whatsAppText}
                  onChange={(e) => setWhatsAppText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/50 outline-none focus:border-emerald-500 text-xs leading-relaxed text-charcoal font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={triggerWhatsAppSend}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Open WhatsApp Web/App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
