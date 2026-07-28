'use client';

import { motion } from 'framer-motion';
import { DollarSign, Clock, GraduationCap, Rocket, Gift, Users } from 'lucide-react';

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'High Commission Earnings',
    description: 'Earn a lucrative flat ₹100 for every single kilogram of honey sold. No earnings ceiling—your performance directly dictates your income.',
  },
  {
    icon: Clock,
    title: 'Flexible Working Hours',
    description: 'Be your own boss. Work full-time or part-time, set your own daily schedules, and target your local residential or retail networks.',
  },
  {
    icon: GraduationCap,
    title: 'Training & Support',
    description: 'Get comprehensive product training, honey tasting samples, sales pitch guides, and promotional brochures directly from our beekeeping team.',
  },
  {
    icon: Rocket,
    title: 'Career Growth',
    description: 'Top performing sales agents get promoted to Area Sales Leads, regional distributors, and territory sales managers with fixed stipends.',
  },
  {
    icon: Gift,
    title: 'Weekly Incentives',
    description: 'Earn additional bonus payouts when you hit weekly volume targets (e.g. extra ₹2,000 bonus on 50 KG weekly sales).',
  },
  {
    icon: Users,
    title: 'Friendly Team',
    description: 'Join a warm, supportive community of ethical food enthusiasts and farmers committed to bringing authentic unheated honey to every home.',
  },
];

export default function WhyJoinUs() {
  return (
    <section className="py-20 bg-cream-bg border-t border-b border-gold-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
            Why Partner With Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Everything You Need To Succeed & Earn
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            We provide full backing, authentic lab-tested products, and transparent payouts so you can focus on growing your earnings.
          </p>
        </div>

        {/* 6 Benefit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BENEFITS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-panel p-8 rounded-3xl border border-gold-300/40 hover:border-gold-400 hover:shadow-card-hover transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-gold-300 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-charcoal mb-3 group-hover:text-gold-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
