'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  ShoppingBag,
  Clock,
  AlertTriangle,
  CreditCard,
  Phone,
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  LogOut,
  MapPin,
  TrendingUp,
  RefreshCw,
  Eye,
  FileText,
  User,
  ArrowRight
} from 'lucide-react';

export default function SalesExecutivePortal() {
  const [salesperson, setSalesperson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'SHOPS' | 'REORDERS' | 'ORDERS' | 'PAYMENTS'>('REORDERS');

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const authRes = await fetch('/api/sales/me');
      const authData = await authRes.json();

      if (authData.success && authData.salesperson) {
        setSalesperson(authData.salesperson);
        const dashRes = await fetch('/api/sales/dashboard');
        const dashData = await dashRes.json();
        if (dashData.success) {
          setDashboardData(dashData);
        }
      } else {
        window.location.href = '/shop-form';
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/sales/logout', { method: 'POST' });
    window.location.href = '/shop-form';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-amber-700 mx-auto mb-3" />
          <p className="font-serif font-bold text-stone-700">Loading Sales CRM…</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {
    totalMyShops: 0,
    newShopsThisMonth: 0,
    interestedShops: 0,
    confirmedShops: 0,
    reordersDueCount: 0,
    totalSalesValue: 0,
    totalKgSold: 0,
    totalOutstanding: 0,
  };

  const reordersDue = dashboardData?.reordersDue || [];
  const recentShops = dashboardData?.recentShops || [];
  const recentOrders = dashboardData?.recentOrders || [];
  const pendingPayments = dashboardData?.pendingPayments || [];

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans text-stone-900">
      {/* Sales Header */}
      <header className="bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-400 text-amber-950 font-serif font-black text-xl flex items-center justify-center shadow-md">
              KHF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg leading-tight">
                  {salesperson?.fullName || 'Sales Executive'}
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Active Field Agent
                </span>
              </div>
              <p className="text-xs text-amber-200">
                ID: {salesperson?.applicationNo} • Territory: {salesperson?.workingTerritory || 'Karnataka'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/shop-form"
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Register</span> Shop
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-xs"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">My Shops</span>
              <Store className="w-5 h-5" />
            </div>
            <div className="text-2xl font-serif font-bold text-stone-900">{metrics.totalMyShops}</div>
            <p className="text-[11px] text-stone-500 mt-0.5">{metrics.newShopsThisMonth} registered this month</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm bg-rose-50/30">
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Reorders Due</span>
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-serif font-bold text-rose-900">{metrics.reordersDueCount}</div>
            <p className="text-[11px] text-rose-700 mt-0.5">Urgent follow-ups needed</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">My Sales Value</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl font-serif font-bold text-emerald-950">
              ₹{metrics.totalSalesValue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">{metrics.totalKgSold} kg delivered</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm bg-amber-50/30">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Pending Credit</span>
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-2xl font-serif font-bold text-amber-950">
              ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">To collect from shops</p>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex border-b border-stone-200 gap-2 overflow-x-auto pb-1">
          {[
            { id: 'REORDERS', label: `Reorders Due (${reordersDue.length})` },
            { id: 'SHOPS', label: `My Shops (${recentShops.length})` },
            { id: 'ORDERS', label: `My Orders (${recentOrders.length})` },
            { id: 'PAYMENTS', label: `Pending Collections (${pendingPayments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl transition whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'bg-amber-800 text-white shadow'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: REORDERS DUE */}
        {selectedTab === 'REORDERS' && (
          <div className="space-y-3">
            {reordersDue.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold text-stone-800">All Reorders Up to Date!</h3>
                <p className="text-xs text-stone-500 mt-1">None of your assigned shops are currently due for reordering.</p>
              </div>
            ) : (
              reordersDue.map((shop: any) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-300 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        {shop.shopCode}
                      </span>
                      <h3 className="font-bold text-stone-900">{shop.shopName}</h3>
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Reorder Due
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 mt-1">
                      Owner: <strong>{shop.ownerName || shop.contactPerson}</strong> • {shop.area}, {shop.city}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-2">
                      <span>Est. Reorder: <strong>{shop.nextReorderDate ? new Date(shop.nextReorderDate).toLocaleDateString('en-IN') : 'Today'}</strong></span>
                      <span>•</span>
                      <span>Total Purchased: <strong>{shop.totalKgPurchased || 0} kg</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={`tel:${shop.mobile}`}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a
                      href={`https://wa.me/91${(shop.whatsapp || shop.mobile || '').replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(shop.shopName)},%20this%20is%20Kamadhenu%20Honey%20Farms.%20Your%20next%20pure%20honey%20stock%20reorder%20is%20due.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-300"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <Link
                      href={`/shop-form`}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Order
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CONTENT: MY SHOPS */}
        {selectedTab === 'SHOPS' && (
          <div className="space-y-3">
            {recentShops.map((shop: any) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-500">{shop.shopCode}</span>
                    <h3 className="font-bold text-stone-900">{shop.shopName}</h3>
                    <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">
                      {shop.shopType}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {shop.ownerName} • {shop.mobile} • {shop.area}, {shop.city}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    ₹{shop.totalPurchaseValue?.toLocaleString('en-IN') || 0}
                  </span>
                  <a
                    href={`tel:${shop.mobile}`}
                    className="p-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB CONTENT: MY ORDERS */}
        {selectedTab === 'ORDERS' && (
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
                <ShoppingBag className="w-12 h-12 text-stone-400 mx-auto mb-2" />
                <p className="text-xs text-stone-500">No orders recorded yet.</p>
              </div>
            ) : (
              recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-900">{order.orderNo}</span>
                      <h4 className="font-bold text-stone-900">{order.shop?.shopName}</h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {new Date(order.orderDate).toLocaleDateString('en-IN')} • {order.product || 'Pure Honey'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-stone-900">
                      ₹{order.totalAmount?.toLocaleString('en-IN') || order.orderValue?.toLocaleString('en-IN') || 0}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase ${order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CONTENT: PENDING COLLECTIONS */}
        {selectedTab === 'PAYMENTS' && (
          <div className="space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-stone-500">No outstanding credit payments due from your shops.</p>
              </div>
            ) : (
              pendingPayments.map((shop: any) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-500">{shop.shopCode}</span>
                      <h4 className="font-bold text-stone-900">{shop.shopName}</h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {shop.ownerName} • {shop.mobile} • Due: {shop.agreedPaymentDate ? new Date(shop.agreedPaymentDate).toLocaleDateString('en-IN') : 'Agreed Terms'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-stone-400 block">Pending</span>
                      <span className="text-base font-bold text-rose-700">
                        ₹{shop.outstandingAmount?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>
                    <a
                      href={`tel:${shop.mobile}`}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                    >
                      Call
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  );
}
