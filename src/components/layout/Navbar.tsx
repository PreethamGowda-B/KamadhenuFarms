'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gold-300/30 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link href="/careers" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gold-600 via-gold-400 to-gold-300 flex items-center justify-center text-2xl shadow-gold-glow group-hover:scale-105 transition-transform duration-300">
              🍯
            </div>
            <div>
              <span className="font-serif font-bold text-xl text-charcoal tracking-wide block leading-tight">
                Kamadhenu
              </span>
              <span className="text-xs uppercase tracking-widest font-semibold text-gold-600 block">
                Honey Farms • Careers
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/careers" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              Careers Home
            </Link>
            <Link href="/careers/sales-agent" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              Sales Partner Job
            </Link>
            <Link href="/careers#faq" className="text-sm font-medium text-charcoal hover:text-gold-600 transition-colors">
              FAQ
            </Link>
            <Link 
              href="/admin/recruitment" 
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gold-100 text-gold-800 border border-gold-300 hover:bg-gold-200 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold-600" /> Admin Portal
            </Link>
          </nav>

          {/* Action CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/careers/apply"
              className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-charcoal hover:text-gold-600 hover:bg-gold-50 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-gold-200 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/careers"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-charcoal hover:bg-gold-50 hover:text-gold-600"
          >
            Careers Home
          </Link>
          <Link
            href="/careers/sales-agent"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-charcoal hover:bg-gold-50 hover:text-gold-600"
          >
            Sales Partner Job
          </Link>
          <Link
            href="/careers#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-charcoal hover:bg-gold-50 hover:text-gold-600"
          >
            FAQ
          </Link>
          <Link
            href="/admin/recruitment"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-gold-800 bg-gold-100"
          >
            🛡️ Admin Dashboard Portal
          </Link>
          <div className="pt-2">
            <Link
              href="/careers/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center block px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-gold-600 rounded-full shadow-md"
            >
              Apply Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
