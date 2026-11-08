'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Volume2,
  VolumeX,
  ShoppingBag,
  Gift,
  Store,
  AlertTriangle,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Clock,
  Sparkles,
  Shield,
  BellRing,
  Loader2,
} from 'lucide-react';
import { useAdminNotifications, AdminNotificationItem } from '@/lib/useAdminNotifications';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestPushToken,
  getClientDeviceInfo,
} from '@/lib/firebaseClient';

function formatTimeAgo(dateString: string): string {
  try {
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 min ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 7200) return '1 hour ago';
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    if (diffSec < 172800) return 'Yesterday';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Recently';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'HIGH_VALUE_ORDER':
    case 'NEW_ORDER':
      return <ShoppingBag className="w-4 h-4 text-amber-600" />;
    case 'REFERRAL_REWARD':
      return <Gift className="w-4 h-4 text-emerald-600" />;
    case 'NEW_SHOP':
      return <Store className="w-4 h-4 text-blue-600" />;
    case 'PAYMENT_FAILED':
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    default:
      return <Bell className="w-4 h-4 text-amber-600" />;
  }
}

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
  mobileSidebarOpen?: boolean;
}

export default function AdminHeader({
  onToggleMobileSidebar,
  mobileSidebarOpen = false,
}: AdminHeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushRegistering, setPushRegistering] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isPushNotificationSupported()) {
      setPushPermission('unsupported');
    } else {
      setPushPermission(getNotificationPermissionState());
    }
  }, []);

  const handleEnablePush = async () => {
    try {
      setPushRegistering(true);
      const res = await requestPushToken();
      setPushPermission(res.permission);
      if (res.token) {
        const deviceInfo = getClientDeviceInfo();
        await fetch('/api/admin/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: res.token,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
          }),
        });
      }
    } catch (e) {
      console.warn('Admin push activation error:', e);
    } finally {
      setPushRegistering(false);
    }
  };

  const {
    notifications,
    unreadCount,
    loading,
    soundMuted,
    toggleSound,
    markAsRead,
    markAllAsRead,
    latestNewNotification,
    clearToast,
  } = useAdminNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Determine current admin module title for breadcrumb
  const getModuleTitle = () => {
    if (!pathname) return 'Dashboard';
    if (pathname.includes('/orders')) return 'Online Orders';
    if (pathname.includes('/products')) return 'Products & Stock';
    if (pathname.includes('/customers')) return 'Customer Directory';
    if (pathname.includes('/referrals')) return 'Referrals & Rewards';
    if (pathname.includes('/shops')) return 'Shop CRM';
    if (pathname.includes('/recruitment/analytics')) return 'Hiring Analytics';
    if (pathname.includes('/recruitment')) return 'Recruitment Hub';
    if (pathname.includes('/settings')) return 'Admin Settings';
    return 'Executive Portal';
  };

  const handleNotificationClick = (n: AdminNotificationItem) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    setDropdownOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-3 sm:px-6 py-2.5 transition-all shadow-xs">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-7xl mx-auto">
          {/* Breadcrumb / Location Header + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 -ml-1 rounded-xl bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-900 transition-colors shrink-0 cursor-pointer"
                aria-label="Toggle admin sidebar navigation"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live Database Connected" />
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium truncate">
              <span className="hidden sm:inline">Admin</span>
              <span className="hidden sm:inline text-stone-300">/</span>
              <span className="font-bold text-stone-900 truncate">{getModuleTitle()}</span>
            </div>
          </div>

          {/* Quick Header Actions: Sound Toggle + Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Alert Chime Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                soundMuted
                  ? 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title={soundMuted ? 'Notification sound is MUTED. Click to enable sound chime.' : 'Notification sound is ACTIVE. Click to mute.'}
              aria-label={soundMuted ? 'Enable notification sound' : 'Mute notification sound'}
            >
              {soundMuted ? (
                <VolumeX className="w-4 h-4 text-stone-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-600" />
              )}
              <span className="text-[11px] font-bold hidden md:inline">
                {mounted ? (soundMuted ? 'Muted' : 'Sound On') : 'Sound'}
              </span>
            </button>

            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`relative p-2 rounded-xl border transition-all ${
                  dropdownOpen
                    ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-md'
                    : mounted && unreadCount > 0
                    ? 'bg-white text-stone-800 border-amber-300 hover:bg-amber-50 shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
                title={`Admin Notifications (${unreadCount} unread)`}
                aria-label="Toggle notifications menu"
              >
                <Bell className={`w-4 h-4 ${mounted && unreadCount > 0 ? 'text-amber-700 animate-bounce' : 'text-stone-600'}`} />

                {/* Animated Unread Badge */}
                {mounted && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white font-mono font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Panel Header */}
                  <div className="bg-[#FAF7F0] px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-sm text-stone-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-amber-500 text-amber-950 px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pushPermission === 'granted' ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Push Active
                        </span>
                      ) : pushPermission !== 'unsupported' ? (
                        <button
                          onClick={handleEnablePush}
                          disabled={pushRegistering}
                          className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition shadow-2xs disabled:opacity-50"
                          title="Receive background order alerts even when tab is closed"
                        >
                          {pushRegistering ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                              <span>Enabling...</span>
                            </>
                          ) : (
                            <>
                              <BellRing className="w-3 h-3 text-amber-700" />
                              <span>Enable Push</span>
                            </>
                          )}
                        </button>
                      ) : null}

                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline transition"
                          title="Mark all notifications as read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-stone-100">
                    {loading && notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-stone-400">
                        Checking latest updates...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-10 px-4 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-stone-800">All caught up!</p>
                        <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                          New order alerts and store activities will appear here in real time.
                        </p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 flex items-start gap-3 transition cursor-pointer group ${
                            item.isRead ? 'bg-white hover:bg-stone-50' : 'bg-amber-50/50 hover:bg-amber-50/80'
                          }`}
                        >
                          {/* Type Icon */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.isRead ? 'bg-stone-100' : 'bg-amber-100'
                          }`}>
                            {getNotificationIcon(item.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs truncate ${item.isRead ? 'font-medium text-stone-800' : 'font-bold text-stone-900'}`}>
                                {item.title}
                              </h4>
                              {!item.isRead && (
                                <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-stone-400">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(item.createdAt)}
                              </span>

                              {item.link && (
                                <span className="text-amber-800 group-hover:underline flex items-center gap-0.5 font-bold">
                                  <span>View</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Mark Read Button */}
                          {!item.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(item.id);
                              }}
                              className="p-1 text-stone-400 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Panel Footer */}
                  <div className="bg-[#FAF7F0] px-4 py-2.5 border-t border-stone-200 flex items-center justify-between text-xs">
                    <Link
                      href="/admin/orders"
                      onClick={() => setDropdownOpen(false)}
                      className="text-stone-700 hover:text-amber-900 font-bold transition flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Orders Ledger</span>
                    </Link>
                    <Link
                      href="/admin/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="text-stone-500 hover:text-stone-800 font-medium transition"
                    >
                      Alert Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Visual Toast Alert (Appears on brand-new real-time order arrival) */}
      {latestNewNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-charcoal text-cream-bg rounded-2xl shadow-2xl border-2 border-gold-500 p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500 text-charcoal flex items-center justify-center shrink-0 font-bold shadow">
              <ShoppingBag className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Instant New Alert
                </span>
                <button
                  onClick={clearToast}
                  className="text-gray-400 hover:text-white p-1 rounded-lg"
                  aria-label="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-serif font-bold text-cream-bg mt-1 truncate">
                {latestNewNotification.title}
              </h4>
              <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">
                {latestNewNotification.message}
              </p>

              <div className="mt-3 flex items-center gap-2">
                {latestNewNotification.link && (
                  <button
                    onClick={() => {
                      if (!latestNewNotification.isRead) markAsRead(latestNewNotification.id);
                      clearToast();
                      router.push(latestNewNotification.link!);
                    }}
                    className="bg-gold-500 hover:bg-gold-400 text-charcoal text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm flex items-center gap-1"
                  >
                    <span>View Order Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    markAsRead(latestNewNotification.id);
                    clearToast();
                  }}
                  className="bg-charcoal-light hover:bg-gray-800 text-gray-300 text-xs px-2.5 py-1.5 rounded-xl transition"
                >
                  Mark as Read
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
