'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Package,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  XCircle,
  ExternalLink,
  Store,
  Users,
  ChevronRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    todayOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    failedPayments: 0,
    refunds: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalCount: 0, totalPages: 1 });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: String(page),
        limit: '25',
      });
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const getOrderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEW: 'bg-amber-100 text-amber-800 border-amber-300',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
      PROCESSING: 'bg-purple-100 text-purple-800 border-purple-300',
      PACKED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      SHIPPED: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      CANCELLED: 'bg-rose-100 text-rose-800 border-rose-300',
      RETURNED: 'bg-stone-100 text-stone-800 border-stone-300',
    };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      PAYMENT_PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
      FAILED: 'bg-rose-100 text-rose-800 border-rose-300',
      REFUNDED: 'bg-stone-100 text-stone-800 border-stone-300',
    };
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shadow">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold text-stone-900">Kamadhenu Orders Ledger</h1>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Razorpay Live
                </span>
              </div>
              <p className="text-xs text-stone-500">Consumer eCommerce Orders, Online Payments & Doorstep Deliveries</p>
            </div>
          </div>

          {/* Navigation Sub-bar */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/admin/shops"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Retail Shops</span>
            </Link>
            <Link
              href="/admin/recruitment"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Careers</span>
            </Link>
            <button
              onClick={fetchOrders}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 10 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Today's Orders</span>
            <span className="text-2xl font-serif font-bold text-amber-900">{metrics.todayOrders}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Pending Review</span>
            <span className="text-2xl font-serif font-bold text-amber-600">{metrics.pendingOrders}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Paid (Razorpay)</span>
            <span className="text-2xl font-serif font-bold text-emerald-600">{metrics.paidOrders}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Processing / Packed</span>
            <span className="text-2xl font-serif font-bold text-purple-700">{metrics.processing + metrics.packed}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Shipped In-Transit</span>
            <span className="text-2xl font-serif font-bold text-cyan-700">{metrics.shipped}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Delivered</span>
            <span className="text-2xl font-serif font-bold text-emerald-800">{metrics.delivered}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Today Revenue</span>
            <span className="text-xl font-serif font-bold text-amber-800">₹{Number(metrics.todayRevenue).toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Month Revenue</span>
            <span className="text-xl font-serif font-bold text-emerald-900">₹{Number(metrics.monthlyRevenue).toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Failed Payments</span>
            <span className="text-2xl font-serif font-bold text-rose-600">{metrics.failedPayments}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Refunds</span>
            <span className="text-2xl font-serif font-bold text-stone-600">{metrics.refunds}</span>
          </div>
        </div>

        {/* Search & Status Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="w-full sm:w-96 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Order #, Customer, Mobile, Pincode..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            </form>

            {/* Quick Status Pill Bar */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {[
                { key: 'ALL', label: 'All Orders' },
                { key: 'NEW', label: 'New' },
                { key: 'PAID', label: 'Paid' },
                { key: 'PROCESSING', label: 'Processing' },
                { key: 'PACKED', label: 'Packed' },
                { key: 'SHIPPED', label: 'Shipped' },
                { key: 'DELIVERED', label: 'Delivered' },
                { key: 'CANCELLED', label: 'Cancelled' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === f.key
                      ? 'bg-amber-500 text-amber-950 shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order Number</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Items / Qty</th>
                  <th className="py-3.5 px-4">Total (₹)</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Courier / AWB</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-stone-400">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-stone-500">
                      No orders found matching this filter criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const shipment = ord.shipments?.[0] || null;
                    return (
                      <tr key={ord.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-900">
                          <Link href={`/admin/orders/${ord.id}`} className="hover:underline">
                            {ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <strong className="block text-stone-900">{ord.customer?.name}</strong>
                          <span className="text-stone-500 font-mono text-[11px]">{ord.customer?.mobile}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block text-stone-800">{ord.shippingAddress?.city}, {ord.shippingAddress?.state}</span>
                          <span className="text-[11px] font-mono text-stone-500">{ord.shippingAddress?.pincode}</span>
                        </td>
                        <td className="py-3 px-4">
                          {ord.items?.map((it: any, i: number) => (
                            <div key={i} className="text-[11px] text-stone-700">
                              {it.quantity}x {it.productNameSnapshot} ({it.weightVariant})
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          ₹{ord.total}
                        </td>
                        <td className="py-3 px-4">
                          {getPaymentStatusBadge(ord.paymentStatus)}
                        </td>
                        <td className="py-3 px-4">
                          {getOrderStatusBadge(ord.orderStatus)}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {shipment?.trackingNumber ? (
                            <div>
                              <span className="font-semibold text-stone-800 block">{shipment.courierProvider}</span>
                              <span className="font-mono text-amber-900">{shipment.trackingNumber}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Not assigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="inline-flex items-center gap-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2.5 py-1.5 rounded-lg font-bold text-xs transition"
                          >
                            <span>Fulfill</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
