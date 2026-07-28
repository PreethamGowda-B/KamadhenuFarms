import Link from 'next/link';
import { MapPin, Phone, Mail, Award, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-cream-bg pt-16 pb-12 border-t-4 border-gold-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-xl">
                🍯
              </div>
              <span className="font-serif font-bold text-xl text-gold-400">
                Kamadhenu Honey
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              100% Pure, Raw, Unprocessed Farm Honey direct from our bee boxes in Taverekere, Magadi Road, Bangalore. Empowering local sales partners across Karnataka.
            </p>
            <div className="flex items-center gap-2 text-xs text-gold-400 font-medium">
              <Award className="w-4 h-4 text-gold-500" />
              <span>Certified Beekeepers & Lab Tested Quality</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4">
              Careers & Opportunities
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/careers" className="hover:text-gold-400 transition-colors">
                  Careers Landing Page
                </Link>
              </li>
              <li>
                <Link href="/careers/sales-agent" className="hover:text-gold-400 transition-colors">
                  Sales Agent Role (₹100/KG)
                </Link>
              </li>
              <li>
                <Link href="/careers/apply" className="hover:text-gold-400 transition-colors">
                  Apply Online Form
                </Link>
              </li>
              <li>
                <Link href="/admin/recruitment" className="hover:text-gold-400 transition-colors">
                  Recruitment Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Benefits Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4">
              Partner Highlights
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-500" /> ₹100 per KG Commission
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-500" /> Flexible Field Hours
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-500" /> Weekly Payout Incentives
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-500" /> Marketing Materials Provided
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4">
              Farm & Recruitment HQ
            </h3>
            <div className="flex items-start gap-3 text-sm text-gray-300">
              <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
              <span>Cholanayakanahalli, Magadi Main Road, Taverekere, Bangalore South, Karnataka 562130</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-gold-500 shrink-0" />
              <span>+91 9980114675</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Mail className="w-4 h-4 text-gold-500 shrink-0" />
              <span>careers@kamadhenuhoneyfarms.com</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} Kamadhenu Honey Farms. All Rights Reserved.</p>
          <p>Designed with Apple, Stripe & Notion visual elegance.</p>
        </div>
      </div>
    </footer>
  );
}
