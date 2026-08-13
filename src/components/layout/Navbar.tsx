'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, Search, Home, ShoppingBag, Info, PhoneCall, HelpCircle, Briefcase } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-cream-bg/90 backdrop-blur-md border-b border-gold-300/40 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link href="/careers" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-gold-300 flex items-center justify-center text-xl sm:text-2xl shadow-gold-glow group-hover:scale-105 transition-transform duration-300">
              🍯
            </div>
            <div>
              <span className="font-serif font-bold text-lg sm:text-xl text-charcoal tracking-wide block leading-tight">
                Kamadhenu
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-gold-600 block">
                Honey Farms • Careers
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-7">
            <a
              href="https://www.kamadhenuhoneyfarms.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gold-700 hover:text-gold-900 transition-colors flex items-center gap-1"
            >
              Main Store 🛍️
            </a>
            <Link href="/careers" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              Careers Home
            </Link>
            <Link href="/careers/sales-agent" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              Sales Partner Job
            </Link>
            <Link href="/track" className="text-sm font-medium text-gold-700 hover:text-gold-900 transition-colors inline-flex items-center gap-1.5 font-semibold">
              <Search className="w-4 h-4 text-gold-600" /> Track Application
            </Link>
            <Link href="/careers#faq" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              FAQ
            </Link>
          </nav>

          {/* Action CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/careers/apply"
              className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Button (3-Line Hamburger Icon) */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              href="/careers/apply"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gold-600 rounded-full shadow-sm sm:hidden"
            >
              Apply
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2.5 rounded-xl text-charcoal bg-gold-100/80 hover:text-gold-700 hover:bg-gold-200/80 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-gold-900" /> : <Menu className="w-6 h-6 text-gold-900" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-20 bottom-0 bg-charcoal/50 backdrop-blur-md z-50 flex flex-col justify-between">
          <div className="bg-cream-bg border-b border-gold-300 shadow-2xl px-5 py-6 space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
            
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold-600 px-3">Navigation Menu</span>
              
              <a
                href="https://www.kamadhenuhoneyfarms.in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-bold text-gold-700 hover:bg-gold-100/70 transition-all active:scale-[0.98]"
              >
                <Home className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Main Store (kamadhenuhoneyfarms.in) 🛍️</span>
              </a>
              
              <Link
                href="/careers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-charcoal hover:bg-gold-100/70 hover:text-gold-700 transition-all active:scale-[0.98]"
              >
                <Briefcase className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Careers Home</span>
              </Link>

              <Link
                href="/careers/sales-agent"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-charcoal hover:bg-gold-100/70 hover:text-gold-700 transition-all active:scale-[0.98]"
              >
                <ShoppingBag className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Sales Executive Job</span>
              </Link>

              <Link
                href="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-gold-800 bg-gold-50 border border-gold-300 hover:bg-gold-100 transition-all active:scale-[0.98]"
              >
                <Search className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Track Application Status</span>
              </Link>

              <Link
                href="/careers#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-charcoal hover:bg-gold-100/70 hover:text-gold-700 transition-all active:scale-[0.98]"
              >
                <HelpCircle className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Frequently Asked Questions (FAQ)</span>
              </Link>

              <Link
                href="/#about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-charcoal hover:bg-gold-100/70 hover:text-gold-700 transition-all active:scale-[0.98]"
              >
                <Info className="w-5 h-5 text-gold-600 shrink-0" />
                <span>About Us</span>
              </Link>

              <Link
                href="/#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-semibold text-charcoal hover:bg-gold-100/70 hover:text-gold-700 transition-all active:scale-[0.98]"
              >
                <PhoneCall className="w-5 h-5 text-gold-600 shrink-0" />
                <span>Contact Us</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-gold-200 space-y-3">
              <Link
                href="/careers/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-lg shadow-gold-500/25 active:scale-95 transition-all"
              >
                <span>Apply for Sales Executive Job</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="https://wa.me/919980114675"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold text-charcoal bg-white border border-gold-300 rounded-full hover:bg-gold-50 transition-colors"
              >
                <span>Contact Recruitment on WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}

