'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Gift,
  Store,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (e) {
      console.error('Logout error', e);
      router.push('/admin/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    {
      label: 'Online Orders (Razorpay)',
      sub: 'Consumer Orders & COD',
      href: '/admin/orders',
      icon: ShoppingBag,
      active: pathname.startsWith('/admin/orders') || pathname.startsWith('/orders'),
      badge: 'Live',
    },
    {
      label: 'Referrals & Offers',
      sub: 'Discounts & Reward Codes',
      href: '/admin/referrals',
      icon: Gift,
      active: pathname.startsWith('/admin/referrals') || pathname.startsWith('/referrals'),
    },
    {
      label: 'Shop CRM & Reorders',
      sub: 'Store Network & Deliveries',
      href: '/admin/shops',
      icon: Store,
      active: pathname.startsWith('/admin/shops') || pathname.startsWith('/shops'),
    },
    {
      label: 'Recruitment Hub',
      sub: 'Applicants & Hiring',
      href: '/admin/recruitment',
      icon: Users,
      active:
        pathname === '/admin/recruitment' ||
        pathname.startsWith('/admin/recruitment/applications') ||
        pathname === '/dashboard' ||
        pathname === '/applications' ||
        pathname.startsWith('/applications/'),
    },
    {
      label: 'Recruitment Analytics',
      sub: 'Hiring Insights & Trends',
      href: '/admin/recruitment/analytics',
      icon: BarChart3,
      active: pathname === '/admin/recruitment/analytics' || pathname === '/analytics',
    },
    {
      label: 'Admin Settings',
      sub: 'Security & Credentials',
      href: '/admin/settings',
      icon: Settings,
      active: pathname.startsWith('/admin/settings') || pathname === '/settings',
    },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-charcoal text-cream-bg px-4 py-3 border-b border-gold-900 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-500 text-charcoal flex items-center justify-center text-lg shadow-sm">
            🛡️
          </div>
          <div>
            <h2 className="font-serif font-bold text-sm text-gold-400">Admin Portal</h2>
            <p className="text-[10px] text-gray-400">Kamadhenu Honey Farms</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-charcoal-light text-cream-bg hover:bg-gold-500 hover:text-charcoal transition-colors"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-charcoal text-cream-bg p-5 shrink-0 border-r border-gold-900 flex flex-col justify-between space-y-6 z-50 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 pb-2 border-b border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-charcoal flex items-center justify-center text-xl font-bold shadow-md shrink-0">
              🛡️
            </div>
            <div className="min-w-0">
              <h2 className="font-serif font-bold text-base text-gold-400 leading-tight truncate">
                Admin Portal
              </h2>
              <p className="text-[11px] text-gray-400 truncate">admin@kamadhenuhoneyfarms.in</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-2 pb-1">
              Modules
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    item.active
                      ? 'bg-gold-500 text-charcoal-dark font-bold shadow-md shadow-gold-500/20'
                      : 'hover:bg-charcoal-light text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.active ? 'text-charcoal-dark' : 'text-gold-400 group-hover:scale-110 transition-transform'
                      }`}
                    />
                    <div className="min-w-0 text-left">
                      <span className="block truncate">{item.label}</span>
                      <span
                        className={`block text-[10px] truncate ${
                          item.active ? 'text-charcoal/80' : 'text-gray-400'
                        }`}
                      >
                        {item.sub}
                      </span>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0 ${
                        item.active ? 'bg-charcoal text-gold-400' : 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Sign Out Button */}
        <div className="pt-4 border-t border-gray-800 space-y-3 shrink-0">
          <div className="bg-charcoal-dark/70 rounded-xl p-2.5 border border-gold-900/60 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Environment</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Online
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-950/60 border border-rose-600/40 text-rose-300 hover:bg-rose-900 hover:text-rose-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Signing Out...' : 'Sign Out Admin'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
