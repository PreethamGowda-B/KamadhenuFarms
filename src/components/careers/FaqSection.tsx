'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    question: 'How do I earn commission with Kamadhenu Honey Farm?',
    answer: 'You earn a direct flat commission of ₹100 for every kilogram of honey sold. For example, if you sell 50 kg of honey in a month, your commission earnings equal ₹5,000. If you sell 200 kg, you earn ₹20,000 plus performance bonuses.',
  },
  {
    question: 'Do I need prior sales experience to apply?',
    answer: 'No prior sales experience is strictly required! We welcome freshers, homemakers, students, and existing retail distributors. We provide complete product knowledge, brochures, and guidance on how to approach local buyers.',
  },
  {
    question: 'Do I need a bike or personal vehicle?',
    answer: 'Having a bike or two-wheeler is recommended for field sales coverage across local neighborhoods, but not mandatory if you plan to sell through your social network, WhatsApp groups, or apartment community stores.',
  },
  {
    question: 'How and when will my commission be paid?',
    answer: 'Commissions are calculated weekly and disbursed directly into your bank account or via UPI (PhonePe / Google Pay / Paytm) every Monday morning.',
  },
  {
    question: 'Are there any registration fees or security deposits?',
    answer: 'No! Joining the Kamadhenu Honey Farm Sales Partner Network is 100% free. We never ask for any registration fees or upfront deposits.',
  },
  {
    question: 'What marketing materials and product samples do you provide?',
    answer: 'We supply digital catalog PDFs, physical honey tasting sample jars, branded flyers, and customer testimonial brochures to help you build instant trust.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-cream-bg border-t border-gold-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-14 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600 flex items-center justify-center gap-1.5">
            <HelpCircle className="w-4 h-4" /> Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Everything you need to know about joining our team and earning commissions.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="glass-panel rounded-2xl border border-gold-300/50 overflow-hidden shadow-sm transition-all duration-300"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-serif font-semibold text-base sm:text-lg text-charcoal hover:text-gold-600 transition-colors"
                >
                  <span>{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-gold-500 text-white' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed border-t border-gold-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
