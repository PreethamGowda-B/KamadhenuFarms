'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [email, setEmail] = useState('admin@kamadhenuhoneyfarms.in');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Invalid email or password');
      }

      // Success -> Redirect to protected admin dashboard
      window.location.href = from;
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FCFBF7] via-[#FAF6EE] to-[#F5EEDC] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Subtle Ambient Honey Glow & Light Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-300/25 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-yellow-400/20 rounded-full filter blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-amber-200/70 shadow-[0_20px_50px_rgba(212,175,55,0.15),0_10px_20px_rgba(0,0,0,0.04)] relative z-10 space-y-7"
      >
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center text-3xl mx-auto shadow-md shadow-amber-300/40 border border-amber-200">
            🍯
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-[10px] font-bold text-amber-900 tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Executive Portal
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900 mt-2">
              Kamadhenu Admin Auth
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Sign in with your authorized admin credentials to access the administration portal.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Admin Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kamadhenuhoneyfarms.in"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-50/70 border border-stone-200/90 text-stone-900 placeholder-stone-400 text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Password *
              </label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-[11px] font-medium text-amber-700 hover:text-amber-800 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-stone-50/70 border border-stone-200/90 text-stone-900 placeholder-stone-400 text-sm outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-stone-400 hover:text-amber-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded bg-white"
              />
              <span className="text-xs text-stone-600 font-medium">Remember Me (30 Days)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-stone-900 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-400/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-amber-300/80 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-900" /> Verifying Credentials...
              </>
            ) : (
              <>
                Secure Sign In <Sparkles className="w-4 h-4 text-stone-900" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-4 border-t border-amber-100 text-center space-y-1 text-[11px] text-stone-500">
          <p className="flex items-center justify-center gap-1.5 text-amber-800 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 256-Bit Encrypted Admin Session
          </p>
          <p>© {new Date().getFullYear()} Kamadhenu Honey Farms Executive Portal</p>
        </div>

      </motion.div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl border border-amber-200 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600" /> Admin Password Recovery
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              For security compliance, admin password reset requests must be authorized directly by the Kamadhenu Farms Chief Administrator.
            </p>
            <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 text-xs text-stone-800 space-y-1">
              <p><strong>Primary Admin HQ Contact:</strong></p>
              <p>Email: admin@kamadhenuhoneyfarms.in</p>
              <p>Phone: +91 9980114675</p>
            </div>
            <button
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-900 font-bold text-xs rounded-xl hover:from-amber-500 hover:to-amber-600 hover:text-white transition-all shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-amber-800 font-bold">Loading executive portal...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
