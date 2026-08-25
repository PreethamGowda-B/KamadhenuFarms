'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Building2,
  Navigation,
  FileText,
  Clock,
  ChevronRight,
  LogOut,
  LogIn
} from 'lucide-react';

interface HoneyProductReq {
  productName: string;
  interested: boolean;
  firstOrderQuantity: number;
  monthlyQuantity: number;
  reorderCycleDays: number;
  kgPerUnit: number;
}

const DEFAULT_PRODUCTS: HoneyProductReq[] = [
  { productName: 'Pure Honey – 500g', interested: true, firstOrderQuantity: 10, monthlyQuantity: 20, reorderCycleDays: 15, kgPerUnit: 0.5 },
  { productName: 'Pure Honey – 1kg', interested: true, firstOrderQuantity: 5, monthlyQuantity: 15, reorderCycleDays: 30, kgPerUnit: 1.0 },
  { productName: 'Dry Fruits Honey – 500g', interested: false, firstOrderQuantity: 0, monthlyQuantity: 10, reorderCycleDays: 30, kgPerUnit: 0.5 },
  { productName: 'Dry Fruits Honey – 1kg', interested: false, firstOrderQuantity: 0, monthlyQuantity: 5, reorderCycleDays: 30, kgPerUnit: 1.0 },
  { productName: 'Comb Honey in Glass Jar – 500g', interested: false, firstOrderQuantity: 0, monthlyQuantity: 5, reorderCycleDays: 30, kgPerUnit: 0.5 },
  { productName: 'Other Specialty Product', interested: false, firstOrderQuantity: 0, monthlyQuantity: 0, reorderCycleDays: 30, kgPerUnit: 1.0 },
];

const SHOP_TYPES = [
  'Grocery Store',
  'Supermarket',
  'Organic Store',
  'Health Store',
  'Dry Fruits Store',
  'General Store',
  'Department Store',
  'Other',
];

export default function ShopOnboardingPage() {
  // Salesperson state
  const [salesperson, setSalesperson] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    whatsapp: '',
    email: '',
    address: '',
    area: '',
    city: 'Bangalore',
    district: '',
    state: 'Karnataka',
    pincode: '',
    mapsUrl: '',
    latitude: '',
    longitude: '',
    shopType: 'Grocery Store',
    frontImageUrl: '',
    interiorImageUrl: '',
    otherImageUrl: '',
    
    // Requirements
    requirements: DEFAULT_PRODUCTS,
    estimatedMonthlyKg: 15,
    estimatedReorderCycleDays: 15,

    // First Order
    firstOrderRequired: true,
    firstOrderItems: [
      { productName: 'Pure Honey – 500g', quantity: 10, unitPrice: 190, kgPerUnit: 0.5 },
      { productName: 'Pure Honey – 1kg', quantity: 5, unitPrice: 360, kgPerUnit: 1.0 },
    ],

    // Payment Terms
    paymentMethod: 'PAYMENT_AT_DELIVERY', // PAYMENT_AT_DELIVERY, CASH, UPI, BANK_TRANSFER, CREDIT
    creditPeriod: '15 Days',
    creditLimit: '10000',
    agreedPaymentDate: '',

    // Relationship
    responseStatus: 'ORDER_CONFIRMED', // INTERESTED, ORDER_CONFIRMED, WANTS_SAMPLE, WANTS_TO_DISCUSS_LATER, NOT_INTERESTED
    potential: 'HIGH', // HIGH, MEDIUM, LOW
    notes: '',
  });

  // UI States
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingInterior, setUploadingInterior] = useState(false);
  const [uploadingOther, setUploadingOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);
  const [locatingGPS, setLocatingGPS] = useState(false);

  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const interiorFileInputRef = useRef<HTMLInputElement>(null);
  const otherFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Salesperson Profile
  useEffect(() => {
    async function checkSalesAuth() {
      try {
        setCheckingAuth(true);
        const res = await fetch('/api/sales/me');
        const data = await res.json();
        if (data.success && data.salesperson) {
          setSalesperson(data.salesperson);
        } else {
          // Open login modal if not authenticated
          setShowLoginModal(true);
        }
      } catch (e) {
        console.error('Sales auth error:', e);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSalesAuth();
  }, []);

  // 2. Draft Storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('khf_shop_draft_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  const saveDraft = (dataToSave: any) => {
    try {
      localStorage.setItem('khf_shop_draft_v2', JSON.stringify(dataToSave));
    } catch (e) {}
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      saveDraft(updated);
      return updated;
    });
  };

  // 3. Salesperson Login
  const handleSalesLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your Sales ID or Mobile');
      return;
    }
    try {
      setLoginLoading(true);
      setLoginError('');
      const res = await fetch('/api/sales/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier }),
      });
      const data = await res.json();
      if (data.success && data.salesperson) {
        setSalesperson(data.salesperson);
        setShowLoginModal(false);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // 4. Image Upload Helper (with Cloudinary signed route)
  const handleImageUpload = async (file: File, type: 'front' | 'interior' | 'other') => {
    if (!file) return;

    if (type === 'front') setUploadingFront(true);
    if (type === 'interior') setUploadingInterior(true);
    if (type === 'other') setUploadingOther(true);

    try {
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('folder', 'kamadhenu_shops');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadForm,
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (type === 'front') handleFieldChange('frontImageUrl', data.url);
        if (type === 'interior') handleFieldChange('interiorImageUrl', data.url);
        if (type === 'other') handleFieldChange('otherImageUrl', data.url);
      } else {
        alert(data.message || 'Image upload failed. Please try a smaller image.');
      }
    } catch (e) {
      alert('Failed to upload image. Please check network connection.');
    } finally {
      if (type === 'front') setUploadingFront(false);
      if (type === 'interior') setUploadingInterior(false);
      if (type === 'other') setUploadingOther(false);
    }
  };

  // 5. GPS Locator Helper
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        handleFieldChange('latitude', lat);
        handleFieldChange('longitude', lng);
        handleFieldChange('mapsUrl', `https://www.google.com/maps?q=${lat},${lng}`);
        setLocatingGPS(false);
      },
      (err) => {
        alert('Could not fetch GPS location: ' + err.message);
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 6. Calculations for First Order
  const calculateFirstOrderTotal = () => {
    if (!formData.firstOrderRequired || !Array.isArray(formData.firstOrderItems)) return 0;
    return formData.firstOrderItems.reduce((sum, item) => {
      const q = Math.max(0, parseInt(String(item.quantity) || '0', 10));
      const p = Math.max(0, parseFloat(String(item.unitPrice) || '0'));
      return sum + (q * p);
    }, 0);
  };

  const calculateFirstOrderKg = () => {
    if (!formData.firstOrderRequired || !Array.isArray(formData.firstOrderItems)) return 0;
    return formData.firstOrderItems.reduce((sum, item) => {
      const q = Math.max(0, parseInt(String(item.quantity) || '0', 10));
      const kg = parseFloat(String(item.kgPerUnit) || '0.5');
      return sum + (q * kg);
    }, 0);
  };

  // 7. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!formData.shopName.trim()) {
      setErrorMessage('Please enter the Shop Name.');
      return;
    }
    if (!formData.ownerName.trim()) {
      setErrorMessage('Please enter the Shop Owner / Contact Person Name.');
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.replace(/[^0-9]/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian Mobile Number.');
      return;
    }
    if (!formData.address.trim() || !formData.area.trim() || !formData.city.trim() || !formData.pincode.trim()) {
      setErrorMessage('Please fill in complete Address, Area, City, and Pincode.');
      return;
    }
    if (!formData.frontImageUrl) {
      setErrorMessage('Shop Front / Board Image is mandatory. Please capture or upload a photo.');
      return;
    }

    if (formData.paymentMethod === 'CREDIT') {
      if (!formData.creditLimit || parseFloat(formData.creditLimit) <= 0) {
        setErrorMessage('Credit Limit cannot be zero or empty when Credit payment terms are selected.');
        return;
      }
      if (!formData.agreedPaymentDate) {
        setErrorMessage('Agreed Payment Date is required when Credit is selected.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        salespersonId: salesperson?.id,
        salespersonName: salesperson?.fullName,
        salespersonMobile: salesperson?.mobileNumber,
        estimatedMonthlyKg: parseFloat(String(formData.estimatedMonthlyKg || '0')),
        estimatedReorderCycleDays: parseInt(String(formData.estimatedReorderCycleDays || '30'), 10),
      };

      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Clear draft
        localStorage.removeItem('khf_shop_draft_v2');
        setSuccessResult({
          shopCode: data.shopCode,
          shopId: data.shopId,
          shopName: formData.shopName,
          salespersonName: salesperson?.fullName || 'Sales Executive',
          date: data.date,
          city: formData.city,
          firstOrderTotal: calculateFirstOrderTotal(),
        });
      } else {
        setErrorMessage(data.message || 'Failed to submit shop. Please check the form.');
      }
    } catch (err: any) {
      setErrorMessage('Network error during submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 8. SUCCESS SCREEN
  if (successResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-100 py-10 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden text-center p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Registration Confirmed
          </span>

          <h2 className="text-2xl font-serif font-bold text-stone-900">
            Shop Submitted Successfully!
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Shop record and requirement profile have been registered in the CRM.
          </p>

          <div className="mt-6 bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-amber-200/60">
              <span className="text-xs text-stone-500 uppercase font-semibold">Generated Shop ID</span>
              <span className="text-sm font-mono font-bold text-amber-950 px-2 py-0.5 bg-amber-200/80 rounded-md">
                {successResult.shopCode}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">Shop Name</span>
              <span className="text-sm font-bold text-stone-900">{successResult.shopName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">Submitted By</span>
              <span className="text-sm font-medium text-stone-800">{successResult.salespersonName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-500">Date</span>
              <span className="text-sm text-stone-700">{successResult.date}</span>
            </div>
            {successResult.firstOrderTotal > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-amber-200/60">
                <span className="text-xs font-bold text-emerald-800">First Order Value</span>
                <span className="text-sm font-bold text-emerald-700">₹{successResult.firstOrderTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                setSuccessResult(null);
                setFormData({
                  shopName: '',
                  ownerName: '',
                  mobile: '',
                  whatsapp: '',
                  email: '',
                  address: '',
                  area: '',
                  city: 'Bangalore',
                  district: '',
                  state: 'Karnataka',
                  pincode: '',
                  mapsUrl: '',
                  latitude: '',
                  longitude: '',
                  shopType: 'Grocery Store',
                  frontImageUrl: '',
                  interiorImageUrl: '',
                  otherImageUrl: '',
                  requirements: DEFAULT_PRODUCTS,
                  estimatedMonthlyKg: 15,
                  estimatedReorderCycleDays: 15,
                  firstOrderRequired: true,
                  firstOrderItems: [
                    { productName: 'Pure Honey – 500g', quantity: 10, unitPrice: 190, kgPerUnit: 0.5 },
                    { productName: 'Pure Honey – 1kg', quantity: 5, unitPrice: 360, kgPerUnit: 1.0 },
                  ],
                  paymentMethod: 'PAYMENT_AT_DELIVERY',
                  creditPeriod: '15 Days',
                  creditLimit: '10000',
                  agreedPaymentDate: '',
                  responseStatus: 'ORDER_CONFIRMED',
                  potential: 'HIGH',
                  notes: '',
                });
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-amber-900 text-white font-bold rounded-xl shadow-lg hover:from-amber-800 hover:to-amber-950 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Register Another Shop
            </button>

            <Link
              href="/sales"
              className="w-full py-3 bg-amber-100/80 hover:bg-amber-200 text-amber-950 font-bold rounded-xl border border-amber-300 transition flex items-center justify-center gap-2 block"
            >
              <Layers className="w-4 h-4" />
              View My Sales Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans text-stone-900">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-amber-900 via-amber-800 to-yellow-900 text-white shadow-md border-b border-amber-700">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-amber-950 font-serif font-black text-lg flex items-center justify-center shadow-md">
              KHF
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-tight tracking-wide">
                Shop Registration
              </h1>
              <p className="text-xs text-amber-200">
                Kamadhenu Honey Farms Field CRM
              </p>
            </div>
          </div>

          {/* Salesperson Auth Status badge */}
          {salesperson ? (
            <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 rounded-full px-3 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-amber-100 max-w-[120px] truncate">{salesperson.fullName}</span>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-amber-300 hover:text-white ml-1 underline text-[10px]"
                title="Switch Agent"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow"
            >
              <LogIn className="w-3.5 h-3.5" />
              Agent Login
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Salesperson Identity Banner */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-orange-100/20 border border-amber-300/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-lg shadow">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">
                  {salesperson ? salesperson.fullName : 'Guest / Unassigned'}
                </span>
                {salesperson && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Verified Executive
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600">
                {salesperson ? `ID: ${salesperson.applicationNo} • ${salesperson.workingTerritory || 'Karnataka'}` : 'Click login to bind your sales identity'}
              </p>
            </div>
          </div>
          
          <Link
            href="/sales"
            className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1 bg-amber-200/80 px-3 py-1.5 rounded-lg border border-amber-300"
          >
            My CRM
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ==================================================== */}
          {/* SECTION A — SHOP DETAILS */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                A
              </div>
              <h2 className="font-serif font-bold text-base text-stone-900">
                Shop & Owner Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Lakshmi Supermarket"
                  value={formData.shopName}
                  onChange={(e) => handleFieldChange('shopName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Shop Owner / Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Shop Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={(e) => handleFieldChange('mobile', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  WhatsApp Number (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Same as mobile or WhatsApp"
                    value={formData.whatsapp}
                    onChange={(e) => handleFieldChange('whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Complete Shop Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="#12, Main Market Road, Near Temple..."
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Area / Locality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jayanagar 4th Block"
                  value={formData.area}
                  onChange={(e) => handleFieldChange('area', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore, Mysore, Hubli..."
                  value={formData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="560041"
                  value={formData.pincode}
                  onChange={(e) => handleFieldChange('pincode', e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Shop Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.shopType}
                  onChange={(e) => handleFieldChange('shopType', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm font-medium"
                >
                  {SHOP_TYPES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* GPS Geolocation helper */}
              <div className="sm:col-span-2 bg-amber-50/50 rounded-xl p-3.5 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Navigation className="w-3.5 h-3.5 text-amber-700" />
                    GPS Territory Location
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    {formData.latitude && formData.longitude
                      ? `Pinned: ${formData.latitude}, ${formData.longitude}`
                      : 'Capture physical shop coordinates for the Territory Map'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locatingGPS}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition self-stretch sm:self-auto justify-center"
                >
                  {locatingGPS ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  {formData.latitude ? 'Update GPS Location' : 'Tag GPS Location'}
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION B — SHOP PHOTOS */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                B
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-stone-900">
                  Shop Photos
                </h2>
                <p className="text-xs text-stone-500">Capture clear shop board and display photos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Mandatory Front / Board Image */}
              <div className="border-2 border-dashed border-amber-400 bg-amber-50/40 rounded-2xl p-4 text-center flex flex-col justify-between items-center relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={frontFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'front');
                  }}
                />

                <span className="text-xs font-bold text-amber-950 mb-2">
                  Shop Front / Board <span className="text-red-600 font-black">*</span>
                </span>

                {formData.frontImageUrl ? (
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative shadow border border-amber-300 group">
                    <img src={formData.frontImageUrl} alt="Shop Front" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => frontFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"
                    >
                      <Camera className="w-4 h-4" /> Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => frontFileInputRef.current?.click()}
                    disabled={uploadingFront}
                    className="w-full py-8 rounded-xl bg-white border border-amber-300 hover:border-amber-500 text-amber-900 flex flex-col items-center justify-center gap-2 shadow-sm transition"
                  >
                    {uploadingFront ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-amber-700" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">Take Photo / Upload</span>
                      </>
                    )}
                  </button>
                )}

                <span className="text-[10px] text-stone-500 mt-2 font-medium">Mandatory for verification</span>
              </div>

              {/* Interior Image */}
              <div className="border border-dashed border-stone-300 bg-stone-50 rounded-2xl p-4 text-center flex flex-col justify-between items-center relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={interiorFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'interior');
                  }}
                />

                <span className="text-xs font-bold text-stone-700 mb-2">
                  Shop Interior (Optional)
                </span>

                {formData.interiorImageUrl ? (
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative shadow border border-stone-300 group">
                    <img src={formData.interiorImageUrl} alt="Shop Interior" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => interiorFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"
                    >
                      <Camera className="w-4 h-4" /> Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => interiorFileInputRef.current?.click()}
                    disabled={uploadingInterior}
                    className="w-full py-8 rounded-xl bg-white border border-stone-300 hover:border-stone-400 text-stone-700 flex flex-col items-center justify-center gap-2 shadow-sm transition"
                  >
                    {uploadingInterior ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-stone-600" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">Upload Interior</span>
                      </>
                    )}
                  </button>
                )}

                <span className="text-[10px] text-stone-400 mt-2">Rack / Shelf photo</span>
              </div>

              {/* Additional Image */}
              <div className="border border-dashed border-stone-300 bg-stone-50 rounded-2xl p-4 text-center flex flex-col justify-between items-center relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={otherFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'other');
                  }}
                />

                <span className="text-xs font-bold text-stone-700 mb-2">
                  Additional Photo
                </span>

                {formData.otherImageUrl ? (
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative shadow border border-stone-300 group">
                    <img src={formData.otherImageUrl} alt="Other Photo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => otherFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1"
                    >
                      <Camera className="w-4 h-4" /> Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => otherFileInputRef.current?.click()}
                    disabled={uploadingOther}
                    className="w-full py-8 rounded-xl bg-white border border-stone-300 hover:border-stone-400 text-stone-700 flex flex-col items-center justify-center gap-2 shadow-sm transition"
                  >
                    {uploadingOther ? (
                      <RefreshCw className="w-8 h-8 animate-spin text-stone-600" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                          <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">Extra Image</span>
                      </>
                    )}
                  </button>
                )}

                <span className="text-[10px] text-stone-400 mt-2">Any other context</span>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION D — HONEY REQUIREMENTS */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                D
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-stone-900">
                  Honey Product Requirements
                </h2>
                <p className="text-xs text-stone-500">Record shop interest and projected reorder cycles</p>
              </div>
            </div>

            <div className="space-y-3">
              {formData.requirements.map((reqItem, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition ${
                    reqItem.interested ? 'bg-amber-50/40 border-amber-300' : 'bg-stone-50 border-stone-200 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-stone-900">{reqItem.productName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...formData.requirements];
                        updated[idx].interested = !updated[idx].interested;
                        handleFieldChange('requirements', updated);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        reqItem.interested ? 'bg-amber-700 text-white' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {reqItem.interested ? 'Interested: YES' : 'Not Interested'}
                    </button>
                  </div>

                  {reqItem.interested && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/50">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase">First Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={reqItem.firstOrderQuantity}
                          onChange={(e) => {
                            const updated = [...formData.requirements];
                            updated[idx].firstOrderQuantity = Math.max(0, parseInt(e.target.value || '0', 10));
                            handleFieldChange('requirements', updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase">Monthly Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={reqItem.monthlyQuantity}
                          onChange={(e) => {
                            const updated = [...formData.requirements];
                            updated[idx].monthlyQuantity = Math.max(0, parseInt(e.target.value || '0', 10));
                            handleFieldChange('requirements', updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase">Cycle (Days)</label>
                        <select
                          value={reqItem.reorderCycleDays}
                          onChange={(e) => {
                            const updated = [...formData.requirements];
                            updated[idx].reorderCycleDays = parseInt(e.target.value, 10);
                            handleFieldChange('requirements', updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                        >
                          <option value={7}>7 Days</option>
                          <option value={15}>15 Days</option>
                          <option value={30}>30 Days</option>
                          <option value={45}>45 Days</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Estimated Monthly Total Requirement (in kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedMonthlyKg}
                    onChange={(e) => handleFieldChange('estimatedMonthlyKg', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 text-sm font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-stone-400">kg/month</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Initial Reorder Cycle Estimate (Days)
                </label>
                <select
                  value={formData.estimatedReorderCycleDays}
                  onChange={(e) => handleFieldChange('estimatedReorderCycleDays', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-bold"
                >
                  <option value={7}>7 Days (Weekly)</option>
                  <option value={15}>15 Days (Fortnightly)</option>
                  <option value={30}>30 Days (Monthly)</option>
                  <option value={45}>45 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION E — FIRST ORDER */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                  E
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-stone-900">
                    First Order (Onboarding Stock)
                  </h2>
                  <p className="text-xs text-stone-500">Record initial confirmed jars and agreed wholesale price</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleFieldChange('firstOrderRequired', !formData.firstOrderRequired)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  formData.firstOrderRequired ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                }`}
              >
                {formData.firstOrderRequired ? 'Order Placed: YES' : 'No Order Today'}
              </button>
            </div>

            {formData.firstOrderRequired && (
              <div className="space-y-3">
                {formData.firstOrderItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select
                        value={item.productName}
                        onChange={(e) => {
                          const updated = [...formData.firstOrderItems];
                          updated[idx].productName = e.target.value;
                          updated[idx].kgPerUnit = e.target.value.includes('1kg') ? 1.0 : 0.5;
                          handleFieldChange('firstOrderItems', updated);
                        }}
                        className="w-full p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                      >
                        <option value="Pure Honey – 500g">Pure Honey – 500g</option>
                        <option value="Pure Honey – 1kg">Pure Honey – 1kg</option>
                        <option value="Dry Fruits Honey – 500g">Dry Fruits Honey – 500g</option>
                        <option value="Dry Fruits Honey – 1kg">Dry Fruits Honey – 1kg</option>
                        <option value="Comb Honey in Glass Jar – 500g">Comb Honey – 500g</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...formData.firstOrderItems];
                            updated[idx].quantity = Math.max(0, parseInt(e.target.value || '0', 10));
                            handleFieldChange('firstOrderItems', updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-stone-400 font-semibold">jars</span>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-[10px] text-stone-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...formData.firstOrderItems];
                            updated[idx].unitPrice = Math.max(0, parseFloat(e.target.value || '0'));
                            handleFieldChange('firstOrderItems', updated);
                          }}
                          className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.firstOrderItems.filter((_, i) => i !== idx);
                          handleFieldChange('firstOrderItems', updated);
                        }}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('firstOrderItems', [
                      ...formData.firstOrderItems,
                      { productName: 'Pure Honey – 500g', quantity: 5, unitPrice: 190, kgPerUnit: 0.5 },
                    ]);
                  }}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg border border-stone-300 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Product
                </button>

                {/* Auto Calculated Order Value Banner */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
                      Total First Order Value
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Total Weight: {calculateFirstOrderKg().toFixed(1)} kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold text-emerald-950">
                      ₹{calculateFirstOrderTotal().toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SECTION F — PAYMENT & CREDIT TERMS */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                F
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-stone-900">
                  Payment Terms
                </h2>
                <p className="text-xs text-stone-500">Default is Payment at Delivery. Credit requires explicit agreement.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Agreed Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PAYMENT_AT_DELIVERY', label: 'Payment at Delivery' },
                  { id: 'CASH', label: 'Instant Cash' },
                  { id: 'UPI', label: 'Instant UPI' },
                  { id: 'CREDIT', label: 'Credit Agreement' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => handleFieldChange('paymentMethod', pm.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      formData.paymentMethod === pm.id
                        ? 'bg-amber-800 text-white border-amber-800 shadow-md'
                        : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Conditional Box */}
            {formData.paymentMethod === 'CREDIT' && (
              <div className="bg-rose-50/70 border border-rose-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Credit Terms & Strict Limit Agreement
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                      Credit Period
                    </label>
                    <select
                      value={formData.creditPeriod}
                      onChange={(e) => handleFieldChange('creditPeriod', e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                    >
                      <option value="7 Days">7 Days</option>
                      <option value="15 Days">15 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="Custom">Custom Agreed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                      Credit Limit (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-stone-500">₹</span>
                      <input
                        type="number"
                        required
                        placeholder="10000"
                        value={formData.creditLimit}
                        onChange={(e) => handleFieldChange('creditLimit', e.target.value)}
                        className="w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                      Agreed Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.agreedPaymentDate}
                      onChange={(e) => handleFieldChange('agreedPaymentDate', e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* SECTION G — SHOP RELATIONSHIP & NOTES */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                G
              </div>
              <h2 className="font-serif font-bold text-base text-stone-900">
                Shop Response & Relationship
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  How did the shop respond?
                </label>
                <select
                  value={formData.responseStatus}
                  onChange={(e) => handleFieldChange('responseStatus', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-semibold"
                >
                  <option value="INTERESTED">Interested</option>
                  <option value="ORDER_CONFIRMED">Order Confirmed</option>
                  <option value="WANTS_SAMPLE">Wants Sample</option>
                  <option value="WANTS_TO_DISCUSS_LATER">Wants to Discuss Later</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Potential
                </label>
                <select
                  value={formData.potential}
                  onChange={(e) => handleFieldChange('potential', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm font-semibold"
                >
                  <option value="HIGH">High Potential (High footfall / organic store)</option>
                  <option value="MEDIUM">Medium Potential</option>
                  <option value="LOW">Low Potential</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Salesperson Visit Notes & Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Shop owner is very interested in Pure Honey 500g bottles. Prefers deliveries on Thursdays. Expects 20-30 bottles/month."
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Validation / Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submission Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-900 text-white font-serif font-bold text-lg rounded-2xl shadow-xl hover:from-amber-800 hover:to-yellow-950 transition flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Submitting Shop Record…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Submit Shop Registration</span>
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* AGENT LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-amber-300 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3 font-serif font-bold text-xl">
              KHF
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Sales Executive Login
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Enter your Sales ID (e.g. KHF-2026-001) or Registered Mobile Number
            </p>

            <form onSubmit={handleSalesLogin} className="mt-5 space-y-4">
              <input
                type="text"
                required
                placeholder="Sales ID or Mobile Number"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm font-semibold text-center uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-600"
              />

              {loginError && (
                <p className="text-xs text-red-600 font-medium">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow transition text-sm flex items-center justify-center gap-2"
              >
                {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Authenticate & Continue
              </button>

              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs text-stone-500 hover:text-stone-800 block mx-auto pt-1 font-semibold"
              >
                Continue as Guest / Admin
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
