'use client';

import { motion } from 'framer-motion';
import { FileText, Search, PhoneCall, Award, ShoppingBag, ChevronDown } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: FileText,
    title: 'Apply Online',
    description: 'Fill out our quick 4-step recruitment form with your basic contact info, location, and sales experience.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Screening',
    description: 'Our recruitment team reviews your location, vehicle availability, and preferred sales area in Karnataka.',
  },
  {
    number: '03',
    icon: PhoneCall,
    title: 'Phone Interview',
    description: 'Short 10-minute phone interaction to introduce product benefits, target sales locations, and commission terms.',
  },
  {
    number: '04',
    icon: Award,
    title: 'Final Selection',
    description: 'Get officially onboarded, receive your Partner ID, digital marketing brochure, and product sample kits.',
  },
  {
    number: '05',
    icon: ShoppingBag,
    title: 'Start Selling',
    description: 'Begin taking orders, supply fresh raw honey to customers, and start earning weekly ₹100/kg commissions!',
  },
];

export default function HiringProcess() {
  return (
    <section className="py-20 bg-cream-soft/60 border-t border-gold-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
            Simple 5-Step Path
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Our Streamlined Hiring Process
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            From application to your first sales payout in less than 48 hours.
          </p>
        </div>

        {/* Desktop Process Timeline (Horizontal) */}
        <div className="hidden lg:grid grid-cols-5 gap-4 relative">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex flex-col items-center text-center relative group"
              >
                {/* Connecting Line */}
                {index < STEPS.length - 1 && (
                  <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gold-400 to-gold-200 z-0" />
                )}

                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-gold-400 text-gold-600 flex items-center justify-center mb-6 shadow-md relative z-10 group-hover:bg-gold-500 group-hover:text-white transition-all duration-300">
                  <Icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 bg-gold-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border border-white">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-serif font-semibold text-lg text-charcoal mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed px-2">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile / Tablet Process Timeline (Vertical) */}
        <div className="lg:hidden space-y-6 max-w-md mx-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="glass-panel p-6 rounded-2xl border border-gold-300 w-full flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-gold-500 text-white flex items-center justify-center shrink-0 font-bold shadow-md">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gold-600 uppercase tracking-wider block">
                      Step {step.number}
                    </span>
                    <h3 className="font-serif font-semibold text-base text-charcoal mb-1">
                      {step.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>

                {index < STEPS.length - 1 && (
                  <ChevronDown className="w-6 h-6 text-gold-500 my-2 animate-bounce" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
