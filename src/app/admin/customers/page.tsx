'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  MapPin,
  ShoppingBag,
  Clock,
  ArrowRight,
  TrendingUp,
  X,
  Phone,
  Mail,
  Calendar,
  Gift,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface CustomerItem {
  id: string;
  name: string;
  mobile: string;
  email: string;
  createdAt: string;
  totalOrders: number;
  lifetimeSpend: number;
  lastOrderDate: string | null;
  lastOrderNumber: string | null;
  addressesCount: number;
  referralRewardsCount: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = async (query = search, targetPage = page) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/customers?search=${encodeURIComponent(query)}&page=${targetPage}&limit=25`
      );
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (e) {
      console.error('Error loading customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(search, 1);
  };

  const openCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setCustomerDetail(data.customer);
      }
    } catch (e) {
      console.error('Failed to load customer detail', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedCustomerId(null);
    setCustomerDetail(null);
  };

  // Aggregated KPIs
  const totalRevenue = customers.reduce((sum, c) => sum + c.lifetimeSpend, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const avgSpend = customers.length ? Math.round(totalRevenue / customers.length) : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Customer Directory
              </h1>
              <p className="text-sm text-gray-500">
                Customer memory, saved delivery addresses & lifetime purchase history
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCustomers(search, page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Customers
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
          <p className="text-xs text-gray-400">Unique customers in database</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Orders Placed
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-400">Total orders from visible customers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Visible Spend
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400">Cumulative order value</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Avg Order Value
            </span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Gift className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-600">₹{avgSpend.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400">Per customer lifetime spend</p>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, 10-digit mobile number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchCustomers('', 1);
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Contact</th>
                <th className="py-3.5 px-5 text-center">Orders</th>
                <th className="py-3.5 px-5 text-right">Lifetime Spend</th>
                <th className="py-3.5 px-5">Last Order</th>
                <th className="py-3.5 px-5 text-center">Saved Addr</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400">
                        Customer since {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-4 px-5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{c.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[180px]">{c.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {c.totalOrders} {c.totalOrders === 1 ? 'order' : 'orders'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-gray-900">
                      ₹{c.lifetimeSpend.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-5">
                      {c.lastOrderDate ? (
                        <div>
                          <div className="font-medium text-xs text-gray-900">
                            {new Date(c.lastOrderDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          {c.lastOrderNumber && (
                            <div className="text-[11px] font-mono text-amber-700">
                              {c.lastOrderNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {c.addressesCount}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => openCustomerDetail(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="py-4 px-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🍯
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {detailLoading ? 'Loading Profile...' : customerDetail?.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Customer ID: {selectedCustomerId}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="py-20 text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                  Fetching complete purchase records...
                </div>
              ) : customerDetail ? (
                <>
                  {/* Contact & Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                        Mobile
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {customerDetail.mobile}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                        Total Orders
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        {customerDetail.totalOrders}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
                        Lifetime Spend
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        ₹{customerDetail.lifetimeSpend?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Saved Delivery Addresses */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      Saved Delivery Addresses ({customerDetail.addresses?.length || 0})
                    </h3>
                    <div className="space-y-2.5">
                      {customerDetail.addresses?.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No saved addresses found.</p>
                      ) : (
                        customerDetail.addresses?.map((addr: any) => (
                          <div
                            key={addr.id}
                            className="p-3.5 bg-amber-50/20 border border-amber-200/50 rounded-xl text-xs space-y-1"
                          >
                            <div className="font-bold text-gray-900 flex items-center justify-between">
                              <span>{addr.recipientName} ({addr.mobileNumber})</span>
                              <span className="text-gray-400 font-mono text-[11px]">{addr.pincode}</span>
                            </div>
                            <div className="text-gray-600">
                              {addr.addressLine1}
                              {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                              {addr.area ? `, ${addr.area}` : ''}
                            </div>
                            <div className="text-gray-500">
                              {addr.city}, {addr.state}
                              {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Purchase History */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                      Order History ({customerDetail.orders?.length || 0})
                    </h3>
                    <div className="space-y-4">
                      {customerDetail.orders?.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No orders found.</p>
                      ) : (
                        customerDetail.orders?.map((ord: any) => (
                          <div
                            key={ord.id}
                            className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm space-y-3"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-sm text-gray-900">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-gray-400 ml-2">
                                  {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ord.paymentStatus === 'PAID' || ord.paymentStatus === 'FULLY_PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.paymentStatus === 'COD_ADVANCE_PAID'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {ord.paymentStatus}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  {ord.orderStatus}
                                </span>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="bg-gray-50/70 p-3 rounded-xl space-y-1.5">
                              {ord.items?.map((it: any) => (
                                <div
                                  key={it.id}
                                  className="flex items-center justify-between text-xs text-gray-700"
                                >
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      {it.productNameSnapshot}
                                    </span>
                                    <span className="text-gray-400 ml-1.5 font-mono">
                                      ({it.weightVariant}) × {it.quantity}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-gray-900">
                                    ₹{it.totalPrice}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Order Totals Footer */}
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                              <div className="text-gray-500">
                                Method: <span className="font-medium text-gray-700">{ord.paymentMethod}</span>
                                {ord.discount > 0 && (
                                  <span className="text-emerald-600 ml-2 font-medium">
                                    Saved ₹{ord.discount}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-sm text-gray-900">
                                Total: ₹{ord.total}
                              </div>
                            </div>

                            {/* Shipment tracking if available */}
                            {ord.shipments?.[0] && (
                              <div className="text-[11px] bg-blue-50 text-blue-800 p-2 rounded-lg flex items-center justify-between">
                                <span>Courier: {ord.shipments[0].courierProvider}</span>
                                {ord.shipments[0].trackingNumber && (
                                  <span className="font-mono">AWB: {ord.shipments[0].trackingNumber}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
