'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gift,
  Plus,
  ShoppingBag,
  Store,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BadgePercent,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  Share2,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Send,
  HelpCircle,
  Info,
  Scale,
  Zap,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react';

interface ReferralOffer {
  id: string;
  code: string;
  discountPercent: number;
  minPurchaseKg: number;
  rewardType: string;
  startDate: string;
  expiryDate?: string | null;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
  description?: string | null;
  referrerCustomer?: {
    id: string;
    name: string;
    mobile: string;
  } | null;
  createdAt: string;
}

interface ReferralUsage {
  id: string;
  discountApplied: number;
  status: string;
  qualifiesReward: boolean;
  createdAt: string;
  offer: { code: string };
  order: { orderNumber: string; total: number; paymentStatus: string };
  referredCustomer: { name: string; mobile: string };
  referrerCustomer?: { name: string; mobile: string } | null;
}

interface ReferralReward {
  id: string;
  rewardCode: string;
  discountPercent: number;
  minPurchaseKg: number;
  isUsed: boolean;
  usedAt?: string | null;
  status: string;
  createdAt: string;
  customer: { name: string; mobile: string };
  offer: { code: string };
}

export default function AdminReferralsPage() {
  const [offers, setOffers] = useState<ReferralOffer[]>([]);
  const [usages, setUsages] = useState<ReferralUsage[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [metrics, setMetrics] = useState({
    totalOffers: 0,
    activeOffers: 0,
    totalUsed: 0,
    qualifiedReferrals: 0,
    pendingReferrals: 0,
    rewardsEarned: 0,
    rewardsUsed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OFFERS' | 'USAGES' | 'REWARDS'>('OFFERS');
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Share Modal & Top-Company Framework State
  const [shareOffer, setShareOffer] = useState<ReferralOffer | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<number>(0);
  const [showFramework, setShowFramework] = useState(true);

  // Form State
  const [form, setForm] = useState({
    code: '',
    discountPercent: 5,
    minPurchaseKg: 1,
    rewardType: 'DISCOUNT_NEXT_PURCHASE',
    expiryDate: '',
    usageLimit: '',
    isActive: true,
    description: '',
  });

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/referrals');
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers || []);
        setUsages(data.usages || []);
        setRewards(data.rewards || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load referrals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      alert('Please enter a referral code');
      return;
    }

    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          code: form.code.trim().toUpperCase(),
          discountPercent: Number(form.discountPercent) || 5,
          minPurchaseKg: Number(form.minPurchaseKg) || 1,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
          expiryDate: form.expiryDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setForm({
          code: '',
          discountPercent: 5,
          minPurchaseKg: 1,
          rewardType: 'DISCOUNT_NEXT_PURCHASE',
          expiryDate: '',
          usageLimit: '',
          isActive: true,
          description: '',
        });
        fetchReferrals();
      } else {
        alert(data.message || 'Failed to create referral');
      }
    } catch (err) {
      alert('Error creating referral');
    }
  };

  const handleToggleActive = async (offer: ReferralOffer) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: offer.id,
          isActive: !offer.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReferrals();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleDeleteOffer = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete referral offer "${code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/referrals?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchReferrals();
      } else {
        alert(data.message || 'Failed to delete offer');
      }
    } catch (err) {
      alert('Error deleting offer');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyTemplateText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(index);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2416]">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shadow">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold text-stone-900">Referral Management</h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-stone-500">Configure 5% referral offers, rewards & customer referral qualifications</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              href="/admin/orders"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>Orders</span>
            </Link>
            <Link
              href="/admin/shops"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Store className="w-3.5 h-3.5 text-stone-600" />
              <span>Retail Shops</span>
            </Link>
            <Link
              href="/admin/recruitment"
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-stone-600" />
              <span>Careers</span>
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Referral Offer</span>
            </button>
            <button
              onClick={fetchReferrals}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 p-1.5 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Total Offers</span>
            <span className="text-2xl font-serif font-bold text-amber-900">{metrics.totalOffers}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Active Live</span>
            <span className="text-2xl font-serif font-bold text-emerald-600">{metrics.activeOffers}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Times Used</span>
            <span className="text-2xl font-serif font-bold text-purple-700">{metrics.totalUsed}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Qualified</span>
            <span className="text-2xl font-serif font-bold text-cyan-700">{metrics.qualifiedReferrals}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Pending</span>
            <span className="text-2xl font-serif font-bold text-amber-600">{metrics.pendingReferrals}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">5% Rewards Earned</span>
            <span className="text-2xl font-serif font-bold text-emerald-800">{metrics.rewardsEarned}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Rewards Used</span>
            <span className="text-2xl font-serif font-bold text-stone-600">{metrics.rewardsUsed}</span>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex gap-2 border-b border-stone-200 pb-2">
          <button
            onClick={() => setActiveTab('OFFERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'OFFERS'
                ? 'bg-amber-500 text-amber-950 shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            <span>Referral Offers ({offers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('USAGES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'USAGES'
                ? 'bg-amber-500 text-amber-950 shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Customer Usages ({usages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REWARDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'REWARDS'
                ? 'bg-amber-500 text-amber-950 shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Earned Rewards ({rewards.length})</span>
          </button>
        </div>

        {/* TAB 1: Referral Offers Table */}
        {activeTab === 'OFFERS' && (
          <div className="space-y-4">
            {/* Top-Company Referral Framework & Standards Benchmark Card */}
            <div className="bg-gradient-to-r from-amber-50 via-stone-50 to-orange-50/60 rounded-2xl border border-amber-200/80 p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-serif font-bold text-stone-900">
                        Top-Company Referral Standards & Framework
                      </h2>
                      <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Industry Benchmark
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      How leading D2C brands & tech pioneers (Uber, Dropbox, CRED, Lenskart) engineer viral, high-trust referral loops
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFramework(!showFramework)}
                  className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-white/90 hover:bg-white border border-amber-200/80 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                >
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showFramework ? 'Hide Best Practices' : 'View Top-Company Standards'}</span>
                  {showFramework ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showFramework && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-amber-200/60 text-xs animate-in fade-in duration-200">
                  <div className="bg-white/95 p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>1. Dual-Sided "Give & Get"</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Leading brands always reward <strong>both sides</strong>. The friend receives an immediate 5% discount at checkout, while the advocate gets a 5% reward coupon for their next order, driving repeat customer lifetime value (LTV).
                    </p>
                  </div>

                  <div className="bg-white/95 p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>2. Server Anti-Fraud Shield</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Zero client trust. Self-referrals (same phone number or delivery identity) are automatically blocked. Referrer vouchers are minted strictly post-payment via Cashfree webhooks, preventing false order exploitation.
                    </p>
                  </div>

                  <div className="bg-white/95 p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span>3. Deep-Linked WhatsApp Sharing</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Friction kills conversion. Top programs provide 1-click WhatsApp invites with pre-formatted personal recommendations and <code className="font-mono bg-stone-100 text-stone-800 px-1 rounded">?ref=CODE</code> links that auto-fill coupons.
                    </p>
                  </div>

                  <div className="bg-white/95 p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-900 font-bold">
                      <Scale className="w-4 h-4 text-rose-600" />
                      <span>4. Clear Rules of Engagement</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Transparent fair-play criteria: Valid exclusively for first-time customers on ≥1kg honey basket sizes, non-transferable to cash, and non-combinable with commercial wholesale distributor rates.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Min. Qualifying Purchase</th>
                      <th className="py-3.5 px-4">Reward Type</th>
                      <th className="py-3.5 px-4">Usage (Times / Limit)</th>
                      <th className="py-3.5 px-4">Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-stone-400">
                          Loading referral offers...
                        </td>
                      </tr>
                    ) : offers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-stone-500">
                          No referral offers created yet. Click "+ New Referral Offer" above to create one.
                        </td>
                      </tr>
                    ) : (
                      offers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-amber-50/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-amber-900 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span>{offer.code}</span>
                              <button
                                onClick={() => copyToClipboard(offer.code)}
                                className="text-stone-400 hover:text-amber-800 transition p-1 rounded hover:bg-amber-100/50"
                                title="Copy code"
                              >
                                {copiedCode === offer.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => setShareOffer(offer)}
                                className="text-amber-600 hover:text-amber-800 transition p-1 rounded hover:bg-amber-100/70"
                                title="Share referral link & messaging copy"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {offer.description && (
                              <span className="text-[11px] text-stone-400 font-normal block font-sans">
                                {offer.description}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-800">
                            {offer.discountPercent}% OFF
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            ≥ {offer.minPurchaseKg}kg Honey
                          </td>
                          <td className="py-3 px-4 text-stone-600 text-[11px]">
                            5% discount on next purchase
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-stone-900">{offer.timesUsed}</span>
                            <span className="text-stone-400 text-[11px]">
                              {offer.usageLimit ? ` / ${offer.usageLimit} max` : ' (Unlimited)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-500 text-[11px]">
                            {offer.expiryDate ? (
                              <span>Exp: {new Date(offer.expiryDate).toLocaleDateString('en-IN')}</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">No expiry</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleActive(offer)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                                offer.isActive
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                              }`}
                            >
                              {offer.isActive ? 'ACTIVE (Live)' : 'INACTIVE'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setShareOffer(offer)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                                title={`Share referral offer ${offer.code}`}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Share</span>
                              </button>
                              <button
                                onClick={() => handleDeleteOffer(offer.id, offer.code)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 transition rounded-lg hover:bg-stone-100"
                                title="Delete offer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Usages & Conversions Table */}
        {activeTab === 'USAGES' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order Number</th>
                    <th className="py-3.5 px-4">Code Used</th>
                    <th className="py-3.5 px-4">Referred Customer</th>
                    <th className="py-3.5 px-4">Order Amount</th>
                    <th className="py-3.5 px-4">Discount Given</th>
                    <th className="py-3.5 px-4">Referral Status</th>
                    <th className="py-3.5 px-4">Reward Qualified</th>
                    <th className="py-3.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-500">
                        No customer referral usages recorded yet.
                      </td>
                    </tr>
                  ) : (
                    usages.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-900">
                          <Link href={`/admin/orders/${u.order?.orderNumber}`} className="hover:underline">
                            {u.order?.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-800">
                          {u.offer?.code}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="block text-stone-900">{u.referredCustomer?.name}</strong>
                          <span className="text-stone-500 font-mono text-[11px]">{u.referredCustomer?.mobile}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          ₹{u.order?.total}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                          -₹{u.discountApplied}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              u.status === 'QUALIFIED' || u.status === 'QUALIFIED_GLOBAL'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.qualifiesReward ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 5% Reward Issued
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Direct / Returning</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Rewards Earned & Redeemed Table */}
        {activeTab === 'REWARDS' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Reward Code</th>
                    <th className="py-3.5 px-4">Beneficiary Customer</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Min. Qualifying Purchase</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Earned</th>
                    <th className="py-3.5 px-4">Date Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rewards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500">
                        No 5% customer rewards earned yet. When an existing customer refers a new customer whose order is paid, the reward code appears here.
                      </td>
                    </tr>
                  ) : (
                    rewards.map((r) => (
                      <tr key={r.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-900 text-sm">
                          {r.rewardCode}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="block text-stone-900">{r.customer?.name}</strong>
                          <span className="text-stone-500 font-mono text-[11px]">{r.customer?.mobile}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {r.discountPercent}% OFF
                        </td>
                        <td className="py-3 px-4 text-stone-700">
                          ≥ {r.minPurchaseKg}kg Honey
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              r.isUsed
                                ? 'bg-stone-100 text-stone-600 border-stone-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {r.isUsed ? 'REDEEMED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px]">
                          {r.usedAt ? new Date(r.usedAt).toLocaleDateString('en-IN') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE REFERRAL OFFER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-700" />
                <span>Create New Referral Offer</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-stone-700 block mb-1">Referral Code *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. KHF-REF5"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 uppercase"
                  />
                  <span className="text-[10px] text-stone-400">Code customers enter at checkout</span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="font-bold text-stone-700 block mb-1">Discount Percentage *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={form.discountPercent}
                      onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 pr-8 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="absolute right-3 top-2 text-stone-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Default: 5%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Min. Qualifying Purchase *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.25"
                      min={0.25}
                      required
                      value={form.minPurchaseKg}
                      onChange={(e) => setForm({ ...form, minPurchaseKg: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 pr-8 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="absolute right-3 top-2 text-stone-400 font-bold">kg</span>
                  </div>
                  <span className="text-[10px] text-stone-400">Default: 1kg honey</span>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Initial Status *</label>
                  <select
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="true">ACTIVE (Go Live Automatically)</option>
                    <option value="false">INACTIVE (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Special 5% referral promo for customers ordering 1kg jar"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                <strong>Referral Reward Rule Active:</strong>
                <p>
                  When set to ACTIVE, this referral offer immediately becomes live on the website. When a new customer completes payment for ≥1kg, the referring existing customer automatically earns a 5% discount reward code for their next purchase of 1kg or more.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-5 py-2 rounded-xl transition shadow-sm"
                >
                  Create & Activate Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE REFERRAL MODAL */}
      {shareOffer && (() => {
        const storeUrl = typeof window !== 'undefined' && window.location.origin
          ? `${window.location.origin}/?ref=${shareOffer.code}`
          : `https://www.kamadhenuhoneyfarms.in/?ref=${shareOffer.code}`;

        const templates = [
          {
            title: 'WhatsApp / Personal Recommendation',
            badge: 'Top D2C Conversion (3.8x)',
            icon: MessageCircle,
            text: `Hey! 🍯 I order 100% pure, unpasteurized raw honey directly from Kamadhenu Honey Farms in Bangalore.\n\nUse my personal referral link to get ${shareOffer.discountPercent}% OFF on your 1kg jar (Code: ${shareOffer.code}):\n${storeUrl}\n\nPure wild harvest with active enzymes and zero adulteration. You'll love the quality! 🐝`,
          },
          {
            title: 'Health & Ayurvedic Purity Focus',
            badge: 'High Trust / Wellness',
            icon: Sparkles,
            text: `Namaste! 🙏 If you're looking for genuine farm-fresh raw honey with zero processing, unheated enzymes, and authentic bee pollen, try Kamadhenu Honey Farms.\n\nUse my referral code ${shareOffer.code} for an exclusive ${shareOffer.discountPercent}% discount on 1kg or more:\n${storeUrl}\n\n100% direct from local beekeepers in Bangalore. 🌿`,
          },
          {
            title: 'Short SMS / Social Media / Status',
            badge: 'Quick Share',
            icon: Send,
            text: `Get ${shareOffer.discountPercent}% OFF pure Bangalore raw comb & wildflower honey at Kamadhenu Honey Farms! Use invite code ${shareOffer.code} at checkout: ${storeUrl}`,
          },
        ];

        const currentTemplate = templates[activeTemplateTab] || templates[0];

        const handleWhatsAppShare = (msg?: string) => {
          const textToSend = msg || currentTemplate.text;
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToSend)}`, '_blank');
        };

        const handleNativeShare = async () => {
          if (typeof navigator !== 'undefined' && navigator.share) {
            try {
              await navigator.share({
                title: `Kamadhenu Honey Farms - ${shareOffer.discountPercent}% Referral Offer`,
                text: `Get ${shareOffer.discountPercent}% OFF pure farm raw honey with code ${shareOffer.code}`,
                url: storeUrl,
              });
            } catch (err) {
              // user cancelled or share failed
            }
          } else {
            copyShareLink(storeUrl);
          }
        };

        const handleEmailShare = () => {
          const subject = encodeURIComponent(`Exclusive ${shareOffer.discountPercent}% OFF on Pure Raw Honey - Kamadhenu Honey Farms`);
          const body = encodeURIComponent(`Hi,\n\nI wanted to share a personal recommendation for 100% pure, unpasteurized raw honey directly from Kamadhenu Honey Farms in Bangalore.\n\nYou can use my referral link to get ${shareOffer.discountPercent}% OFF on orders of 1kg or more:\n${storeUrl}\n\n(Referral Code: ${shareOffer.code})\n\nEnjoy the authentic apiary honey!`);
          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        };

        return (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 my-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-stone-900">
                        Share Referral Offer
                      </h3>
                      <span className="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                        {shareOffer.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shareOffer.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {shareOffer.isActive ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Multi-channel sharing suite with top-company referral incentives & pre-formatted copy
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShareOffer(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Dual-Sided Value Framework (Top Company Pattern) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-3.5 rounded-2xl border border-amber-200/70">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-amber-700" />
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                      Referred Friend Gets (New Buyer)
                    </span>
                  </div>
                  <div className="text-lg font-bold text-stone-900">
                    {shareOffer.discountPercent}% Instant Discount
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Applied at checkout on orders of ≥ {shareOffer.minPurchaseKg}kg pure honey
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-3.5 rounded-2xl border border-emerald-200/70">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-emerald-700" />
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                      Referring Customer Earns (Advocate)
                    </span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800">
                    5% Reward Voucher
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Automatically generated for next 1kg+ purchase once friend's order is paid
                  </p>
                </div>
              </div>

              {/* Tracked Link Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tracked Referral Link (Auto-applies code at checkout)</span>
                  </span>
                  <span className="text-[11px] text-stone-400 font-normal">Query param: ?ref={shareOffer.code}</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 truncate select-all">
                    {storeUrl}
                  </div>
                  <button
                    onClick={() => copyShareLink(storeUrl)}
                    className="bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-stone-200 hover:bg-stone-100 rounded-xl text-stone-600 transition"
                    title="Test Open in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* 1-Click Social Sharing Channels */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-700 block">Instant Share Channels</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleWhatsAppShare()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Share on WhatsApp</span>
                  </button>
                  <button
                    onClick={handleNativeShare}
                    className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Native Mobile Share</span>
                  </button>
                  <button
                    onClick={handleEmailShare}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Invite via Email</span>
                  </button>
                </div>
              </div>

              {/* Curated Message Templates (Top-Company Standard) */}
              <div className="space-y-2.5 border-t border-stone-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pre-Written Message Templates (Top D2C Benchmarks)</span>
                  </span>
                  <span className="text-[10px] text-stone-400">Click tab to switch copy</span>
                </div>

                {/* Template Selector Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {templates.map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTemplateTab(idx)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTemplateTab === idx
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      <span>{tpl.title.split(' ')[0]}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/60 text-amber-950 font-medium">
                        {tpl.badge}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Active Template Preview */}
                <div className="bg-[#FAF7F0] border border-amber-200/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <currentTemplate.icon className="w-3.5 h-3.5 text-amber-700" />
                      <span>{currentTemplate.title}</span>
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md">
                      {currentTemplate.badge}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed font-sans bg-white/70 p-3 rounded-xl border border-stone-200/60 select-all">
                    {currentTemplate.text}
                  </p>

                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => copyTemplateText(currentTemplate.text, activeTemplateTab)}
                      className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      {copiedTemplateIdx === activeTemplateTab ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied Message!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-500" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare(currentTemplate.text)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send This via WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Top-Company Referral Terms & Safeguards Checklist */}
              <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Top-Company Referral Standards & Anti-Abuse Rules Enforced</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600">
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>New Customers Only:</strong> Referral discount activates exclusively on first purchase mobile numbers.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Self-Referral Shield:</strong> Customer cannot redeem their own referral code (phone matching).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Threshold Protection:</strong> Minimum qualifying cart size is ≥ {shareOffer.minPurchaseKg}kg pure honey.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>Payment-Triggered Reward:</strong> 5% advocate voucher is issued only after Cashfree payment succeeds.</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                <span className="text-[11px] text-stone-400">
                  Kamadhenu Honey Farms Referral Suite • Authoritative Server Verification
                </span>
                <button
                  onClick={() => setShareOffer(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
