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
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Subtle Ambient Honey Particle Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#D8A64F_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-gold-500/15 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gold-600/15 rounded-full filter blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel-dark p-8 sm:p-10 rounded-3xl border border-gold-400/40 shadow-2xl relative z-10 space-y-8"
      >
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-600 via-gold-500 to-gold-400 flex items-center justify-center text-3xl mx-auto shadow-gold-glow">
            🍯
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400 block flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-500" /> Executive Portal
            </span>
            <h1 className="text-2xl font-serif font-bold text-white mt-1">
              Kamadhenu Admin Auth
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Sign in with your authorized admin credentials to access the recruitment dashboard.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-gold-300 mb-1.5">
              Admin Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gold-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kamadhenuhoneyfarms.in"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-charcoal-dark/80 border border-gold-400/40 text-white placeholder-gray-500 text-sm outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gold-300">
                Password *
              </label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-[11px] font-medium text-gold-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-charcoal-dark/80 border border-gold-400/40 text-white placeholder-gray-500 text-sm outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gold-400 transition-colors"
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
                className="w-4 h-4 accent-gold-500 rounded bg-charcoal"
              />
              <span className="text-xs text-gray-300">Remember Me (30 Days)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-charcoal-dark bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-300 hover:to-gold-500 shadow-gold-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
              </>
            ) : (
              <>
                Secure Sign In <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-4 border-t border-gold-500/20 text-center space-y-1 text-[11px] text-gray-400">
          <p className="flex items-center justify-center gap-1.5 text-gold-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Encrypted Admin Session
          </p>
          <p>© {new Date().getFullYear()} Kamadhenu Honey Farms Executive Portal</p>
        </div>

      </motion.div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-dark p-6 rounded-2xl border border-gold-400 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-serif font-bold text-gold-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Admin Password Recovery
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              For security compliance, admin password reset requests must be authorized directly by the Kamadhenu Farms Chief Administrator.
            </p>
            <div className="bg-charcoal p-3 rounded-xl border border-gold-900 text-xs text-gold-300 space-y-1">
              <p><strong>Primary Admin HQ Contact:</strong></p>
              <p>Email: admin@kamadhenuhoneyfarms.in</p>
              <p>Phone: +91 9980114675</p>
            </div>
            <button
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2 bg-gold-500 text-charcoal-dark font-bold text-xs rounded-xl hover:bg-gold-400 transition-colors"
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
    <Suspense fallback={<div className="min-h-screen bg-charcoal flex items-center justify-center text-gold-400 font-bold">Loading executive portal...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
