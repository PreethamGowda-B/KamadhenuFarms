'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Save,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  baseDesc: string;
  prices: Record<string, number>;
  image: string;
  images: string[];
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'RESTOCKING_SOON';
  restockDays: number;
  restockNote: string;
  badgeText: string;
  canPreorder: boolean;
  updatedAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      } else {
        setErrorMessage(data.message || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('Error fetching admin products:', err);
      setErrorMessage(err.message || 'Network error loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFieldChange = (id: string, field: keyof ProductItem, value: any) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // Automatically configure badge text and note when stockStatus changes
        if (field === 'stockStatus') {
          if (value === 'IN_STOCK') {
            updated.badgeText = item.category === 'raw' ? 'Organic' : 'Deluxe';
          } else if (value === 'OUT_OF_STOCK') {
            updated.badgeText = 'Sold Out';
          } else if (value === 'RESTOCKING_SOON') {
            updated.badgeText = `Restocking in ${item.restockDays || 3} days`;
            if (!item.restockNote || item.restockNote.includes('restocked')) {
              updated.restockNote = `Stock will be restocked within ${item.restockDays || 3} days`;
            }
          }
        }

        if (field === 'restockDays') {
          const days = Number(value) || 3;
          updated.restockDays = days;
          if (item.stockStatus === 'RESTOCKING_SOON') {
            updated.badgeText = `Restocking in ${days} days`;
            updated.restockNote = `Stock will be restocked within ${days} days`;
          }
        }

        return updated;
      })
    );
  };

  const handleSaveProduct = async (product: ProductItem) => {
    try {
      setSavingId(product.id);
      setErrorMessage(null);

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          stockStatus: product.stockStatus,
          restockDays: product.restockDays,
          restockNote: product.restockNote,
          badgeText: product.badgeText,
          canPreorder: product.canPreorder,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessId(product.id);
        setTimeout(() => setSaveSuccessId(null), 3000);
      } else {
        alert(data.message || 'Failed to save product stock status');
      }
    } catch (err: any) {
      console.error('Error saving product stock:', err);
      alert('Error updating stock: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Metrics
  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.stockStatus === 'IN_STOCK').length;
  const restockingCount = products.filter((p) => p.stockStatus === 'RESTOCKING_SOON').length;
  const outOfStockCount = products.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gold-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gold-100 text-gold-700">
              <Package className="w-5 h-5 text-gold-600" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">
              Products & Realtime Stock
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
            Control live inventory availability across the Kamadhenu Honey Farms customer store.
            Changes update instantly on the customer homepage and cart in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold-300 text-xs font-semibold text-charcoal hover:bg-gold-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Live Store
          </Link>

          <button
            onClick={fetchProducts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-charcoal text-cream-bg text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gold-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Items</span>
            <span className="text-xl font-bold text-charcoal">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">In Stock</span>
            <span className="text-xl font-bold text-emerald-700">{inStockCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Restocking</span>
            <span className="text-xl font-bold text-amber-700">{restockingCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Out of Stock</span>
            <span className="text-xl font-bold text-rose-700">{outOfStockCount}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Product Cards List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold-500" />
          <p className="text-sm font-semibold text-gray-500">Loading product inventory...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((product) => {
            const isSaving = savingId === product.id;
            const isSuccess = saveSuccessId === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gold-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Image & Details */}
                  <div className="lg:col-span-4 flex gap-4 items-start">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-gold-100 bg-amber-50/40 shrink-0 relative">
                      <img
                        src={`/${product.image}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {product.stockStatus === 'OUT_OF_STOCK' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold uppercase tracking-wider">
                          Sold Out
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 border border-gold-300">
                          {product.category}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400 font-semibold">
                          ID: {product.id}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-base sm:text-lg text-charcoal leading-snug">
                        {product.name}
                      </h3>
                      {product.subtitle && (
                        <p className="text-xs text-gold-600 font-medium">{product.subtitle}</p>
                      )}

                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {Object.entries(product.prices).map(([size, price]) => (
                          <span
                            key={size}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-700"
                          >
                            {size}: ₹{price}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Stock Status Controls */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-2">
                        Inventory Availability Status
                      </label>
                      
                      {/* Status Selector Pills */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* IN STOCK */}
                        <button
                          type="button"
                          onClick={() => handleFieldChange(product.id, 'stockStatus', 'IN_STOCK')}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            product.stockStatus === 'IN_STOCK'
                              ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🟢</span>
                            {product.stockStatus === 'IN_STOCK' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-charcoal block">In Stock</span>
                          <span className="text-[10px] text-gray-500 leading-tight">Instant order</span>
                        </button>

                        {/* RESTOCKING SOON */}
                        <button
                          type="button"
                          onClick={() => handleFieldChange(product.id, 'stockStatus', 'RESTOCKING_SOON')}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            product.stockStatus === 'RESTOCKING_SOON'
                              ? 'bg-amber-50 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">⏳</span>
                            {product.stockStatus === 'RESTOCKING_SOON' && (
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-charcoal block">Restocking</span>
                          <span className="text-[10px] text-gray-500 leading-tight">Within 3 days</span>
                        </button>

                        {/* OUT OF STOCK */}
                        <button
                          type="button"
                          onClick={() => handleFieldChange(product.id, 'stockStatus', 'OUT_OF_STOCK')}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            product.stockStatus === 'OUT_OF_STOCK'
                              ? 'bg-rose-50 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🔴</span>
                            {product.stockStatus === 'OUT_OF_STOCK' && (
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-charcoal block">No Stock</span>
                          <span className="text-[10px] text-gray-500 leading-tight">Sold out</span>
                        </button>
                      </div>
                    </div>

                    {/* Restocking Details Panel (conditionally shown if RESTOCKING_SOON) */}
                    {product.stockStatus === 'RESTOCKING_SOON' && (
                      <div className="bg-amber-50/70 border border-amber-300/80 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700" /> Restock Timeframe
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 5, 7].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => handleFieldChange(product.id, 'restockDays', days)}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                                  product.restockDays === days
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'
                                }`}
                              >
                                {days}d
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Customer Restock Notice:
                          </label>
                          <input
                            type="text"
                            value={product.restockNote}
                            onChange={(e) => handleFieldChange(product.id, 'restockNote', e.target.value)}
                            placeholder="e.g. Stock will be restocked within 3 days"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white text-charcoal font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 font-medium">Allow Customer Pre-orders:</span>
                          <button
                            type="button"
                            onClick={() => handleFieldChange(product.id, 'canPreorder', !product.canPreorder)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                              product.canPreorder
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {product.canPreorder ? 'Pre-Order Enabled' : 'Disabled (Waitlist Only)'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Out of Stock Notice */}
                    {product.stockStatus === 'OUT_OF_STOCK' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
                        <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Storefront Buttons Disabled</p>
                          <p className="text-[11px] text-rose-700">
                            Add to Cart and Buy Now buttons will be disabled with &ldquo;Out of Stock&rdquo; state.
                            Customers can still submit Bulk Inquiries on WhatsApp.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Storefront Preview & Save Button */}
                  <div className="lg:col-span-3 bg-gray-50/80 rounded-xl p-4 border border-gray-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        Live Storefront Badge
                      </span>

                      {product.stockStatus === 'IN_STOCK' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{product.badgeText || 'In Stock'}</span>
                        </div>
                      )}

                      {product.stockStatus === 'RESTOCKING_SOON' && (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{product.badgeText || `Restocking in ${product.restockDays} days`}</span>
                          </div>
                          <p className="text-[10px] text-amber-700 italic">
                            &ldquo;{product.restockNote}&rdquo;
                          </p>
                        </div>
                      )}

                      {product.stockStatus === 'OUT_OF_STOCK' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold shadow-xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Sold Out</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveProduct(product)}
                        disabled={isSaving}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                          isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gold-500 text-charcoal hover:bg-gold-600'
                        } disabled:opacity-50`}
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving to Live DB...
                          </>
                        ) : isSuccess ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            Updated Real-Time!
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Update Realtime
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions card */}
      <div className="bg-amber-50/50 border border-gold-200 rounded-2xl p-5 text-xs text-charcoal space-y-2">
        <h4 className="font-serif font-bold text-sm text-gold-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-gold-600" /> Real-time Storefront Synchronization
        </h4>
        <p className="text-gray-600 leading-relaxed">
          When you change a product to &ldquo;Restocking within 3 days&rdquo; or &ldquo;No Stock&rdquo; and click &ldquo;Update Realtime&rdquo;, the new status is immediately stored in PostgreSQL and broadcast to all current and new visitors on the website.
        </p>
      </div>
    </div>
  );
}
