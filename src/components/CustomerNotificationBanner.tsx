'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, ShieldCheck, X, Loader2 } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestPushToken,
  getClientDeviceInfo,
} from '@/lib/firebaseClient';

interface Props {
  orderNumber?: string;
}

export default function CustomerNotificationBanner({ orderNumber }: Props) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(getNotificationPermissionState());
    }
  }, []);

  if (!supported || dismissed) {
    return null;
  }

  // Already granted
  if (permission === 'granted' || success) {
    return (
      <div className="non-print-section bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              Live Delivery Notifications Active on this Device!
            </h4>
            <p className="text-[11px] sm:text-xs text-emerald-800 mt-0.5">
              You will receive instant push notifications as your pure honey is bottled, packed, dispatched, and out for delivery.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Denied by browser
  if (permission === 'denied') {
    return null; // Don't nag customer if they previously blocked notifications
  }

  // Default state: prompt user
  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      const result = await requestPushToken();
      setPermission(result.permission);

      if (result.token) {
        const deviceInfo = getClientDeviceInfo();
        const res = await fetch('/api/customer/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: result.token,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccess(true);
        }
      }
    } catch (err) {
      console.warn('Customer notification consent error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="non-print-section bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden transition-all">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-full transition"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-amber-950 flex items-center justify-center shrink-0 shadow-md">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-sm sm:text-base text-amber-950">
                Track Delivery in Real Time on This Device
              </h3>
              <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Instant Updates
              </span>
            </div>
            <p className="text-xs text-stone-600 max-w-lg leading-relaxed">
              Enable background push notifications to receive doorstep arrival alerts as your farm-fresh honey is packed, dispatched, and out for delivery{orderNumber ? ` for order ${orderNumber}` : ''}.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Strictly transactional delivery updates only • No marketing spam</span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex sm:flex-col items-center gap-2 shrink-0">
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Enable Live Updates</span>
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] text-stone-500 hover:text-stone-800 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
