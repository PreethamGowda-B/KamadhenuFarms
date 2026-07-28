'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Key, Mail, Bell, Lock, Save, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [email, setEmail] = useState('admin@kamadhenuhoneyfarms.in');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsAppNotifications, setWhatsAppNotifications] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-cream-bg py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <Link href="/dashboard" className="text-xs font-semibold text-gold-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold text-charcoal">Admin Portal Settings</h1>
              <p className="text-xs text-gray-600">Configure security settings, executive notifications, and system credentials.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Admin Security Active
            </span>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings updated and saved successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Account Credentials */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gold-300 space-y-6">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <Mail className="w-5 h-5 text-gold-600" /> Admin Account Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal mb-1">Primary Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gold-300 bg-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal mb-1">Role / Authority Level</label>
                <input
                  type="text"
                  disabled
                  value="Chief Administrator (Role: ADMIN)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gold-200 bg-gray-100 text-xs text-gray-500 font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gold-300 space-y-6">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <Lock className="w-5 h-5 text-gold-600" /> Change Security Password
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gold-300 bg-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gold-300 bg-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-charcoal mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gold-300 bg-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gold-300 space-y-4">
            <h3 className="text-lg font-serif font-bold text-charcoal flex items-center gap-2 border-b border-gold-200 pb-3">
              <Bell className="w-5 h-5 text-gold-600" /> Executive Notification Triggers
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 accent-gold-500 rounded"
                />
                <span>Receive instant admin email alert when new candidate applies.</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsAppNotifications}
                  onChange={(e) => setWhatsAppNotifications(e.target.checked)}
                  className="w-4 h-4 accent-gold-500 rounded"
                />
                <span>Send automated WhatsApp confirmation to candidates on status changes.</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white font-semibold text-xs rounded-full shadow-md hover:shadow-gold-500/30 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save System Settings
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
