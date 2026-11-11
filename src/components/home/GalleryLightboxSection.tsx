'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

type GalleryCategory =
  | 'all'
  | 'boxes'
  | 'collection'
  | 'farmlife'
  | 'extraction'
  | 'packing'
  | 'deliveries';

interface GalleryItem {
  id: string;
  category: Exclude<GalleryCategory, 'all'>;
  categoryLabel: string;
  title: string;
  src: string;
  fallbackSrc?: string;
  alt: string;
}

const FILTER_TABS: Array<{ id: GalleryCategory; label: string }> = [
  { id: 'all', label: 'All Photos' },
  { id: 'boxes', label: 'Bee Boxes' },
  { id: 'collection', label: 'Honey Collection' },
  { id: 'farmlife', label: 'Farm Life' },
  { id: 'extraction', label: 'Honey Extraction' },
  { id: 'packing', label: 'Packing Process' },
  { id: 'deliveries', label: 'Deliveries' },
];

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'g1',
    category: 'boxes',
    categoryLabel: 'Bee Boxes',
    title: 'Colony Hives in Taverekere',
    src: 'assets/farm_purity.jpg',
    alt: 'Bee Boxes on Taverekere Farm',
  },
  {
    id: 'g2',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Pure Raw Honey Bottle',
    src: 'assets/raw_honey.jpg',
    alt: 'Raw Farm Honey Bottle',
  },
  {
    id: 'g3',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Rich Nut Infused Honey',
    src: 'assets/dry_fruits_honey.jpg',
    alt: 'Dry Fruits Honey Bottle',
  },
  {
    id: 'g4',
    category: 'farmlife',
    categoryLabel: 'Farm Life',
    title: 'Pristine Farm Ecosystem',
    src: 'assets/farm_purity.jpg',
    alt: 'Lush Green Bangalore Farm Life',
  },
  {
    id: 'g5',
    category: 'extraction',
    categoryLabel: 'Extraction',
    title: 'Centrifugal Cold Filtration',
    src: 'assets/hero_honey.jpg',
    alt: 'Traditional Cold Extraction',
  },
  {
    id: 'g6',
    category: 'packing',
    categoryLabel: 'Packing Process',
    title: 'Strict Glass Packaging',
    src: 'assets/raw_honey.jpg',
    alt: 'Premium Glass Jar Sterilization',
  },
  {
    id: 'g7',
    category: 'deliveries',
    categoryLabel: 'Deliveries',
    title: 'Bangalore Doorstep Courier',
    src: 'assets/hero_honey.jpg',
    alt: 'Direct Doorstep Deliveries Bangalore',
  },
  {
    id: 'g8',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Pure Bee-Crafted Combs',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_29_45_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_29_45 PM.png',
    alt: 'Kamadhenu Raw Honeycomb',
  },
  {
    id: 'g9',
    category: 'packing',
    categoryLabel: 'Packing Process',
    title: 'Premium Sterilized Bottles',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_31_52_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_31_52 PM.png',
    alt: 'Glass Jar Packaging',
  },
  {
    id: 'g10',
    category: 'extraction',
    categoryLabel: 'Extraction',
    title: 'Direct From Active Hives',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_36_11_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_36_11 PM.png',
    alt: 'Raw Golden Honey Pour',
  },
  {
    id: 'g11',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Rich Cashew & Walnut Mix',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_39_22_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_39_22 PM.png',
    alt: 'Gourmet Dry Fruits Honey',
  },
  {
    id: 'g12',
    category: 'boxes',
    categoryLabel: 'Bee Boxes',
    title: 'Natural Honeycomb Cells',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_42_34_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_42_34 PM.png',
    alt: 'Pristine Comb Frames',
  },
  {
    id: 'g13',
    category: 'farmlife',
    categoryLabel: 'Farm Life',
    title: 'Traditional Farm Harvesting',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_43_33_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_43_33 PM.png',
    alt: 'Organic Farm Harvest',
  },
  {
    id: 'g14',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Deluxe Infusion Selection',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_46_15_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_46_15 PM.png',
    alt: 'Luxury Gift Box',
  },
  {
    id: 'g15',
    category: 'boxes',
    categoryLabel: 'Bee Boxes',
    title: 'Ethical Colony Apiary Hives',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_47_14_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_47_14 PM.png',
    alt: 'Bangalore Farm Apiary',
  },
  {
    id: 'g16',
    category: 'collection',
    categoryLabel: 'Honey Collection',
    title: 'Aromatic Floral Infusions',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_51_53_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_51_53 PM.png',
    alt: 'Wild Forest Infusions',
  },
  {
    id: 'g17',
    category: 'packing',
    categoryLabel: 'Packing Process',
    title: 'Limited Launch Honey Preserves',
    src: 'assets/opt/chatgpt_image_jun_13_2026_07_54_12_pm.webp',
    fallbackSrc: 'assets/ChatGPT Image Jun 13, 2026, 07_54_12 PM.png',
    alt: 'Artisan Honey Preserves',
  },
];

export function GalleryLightboxSection() {
  const [activeFilter, setActiveFilter] = useState<GalleryCategory>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return GALLERY_ITEMS;
    return GALLERY_ITEMS.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const activeLightboxItem =
    lightboxIndex !== null && filteredItems[lightboxIndex]
      ? filteredItems[lightboxIndex]
      : null;

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % filteredItems.length
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + filteredItems.length) % filteredItems.length
        );
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, filteredItems.length]);

  return (
    <section className="gallery" id="gallery">
      <div className="container">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="section-subtitle">Visual Storytelling</span>
          <h2>Kamadhenu Gallery Highlights</h2>
        </motion.div>

        {/* Animated Category Filters */}
        <div
          className="gallery-filters"
          role="tablist"
          aria-label="Gallery category filters"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setLightboxIndex(null);
                }}
                className={`relative rounded-full px-4 py-2 text-xs sm:text-sm font-semibold border transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white text-[#4A3113] border-[#D8A64F]/30 hover:border-[#D8A64F]'
                }`}
              >
                {isActive && !shouldReduceMotion && (
                  <motion.span
                    layoutId="gallery-filter-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#B6852F] to-[#D8A64F] shadow-sm"
                  />
                )}
                {isActive && shouldReduceMotion && (
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#B6852F] to-[#D8A64F] shadow-sm" />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Responsive Animated Photo Grid */}
        <motion.div layout={!shouldReduceMotion} className="gallery-grid">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.button
                key={item.id}
                type="button"
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setLightboxIndex(idx)}
                aria-label={`Open photo: ${item.title}`}
                className="gallery-item text-left group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A64F]"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (item.fallbackSrc && !img.dataset.fb) {
                      img.dataset.fb = '1';
                      img.src = item.fallbackSrc;
                    }
                  }}
                />
                <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 text-[#2B1A09] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow">
                  <Expand className="w-4 h-4" />
                </div>
                <div className="gallery-item-info">
                  <span>{item.categoryLabel}</span>
                  <h4>{item.title}</h4>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Interactive Lightbox Modal */}
      <AnimatePresence>
        {activeLightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label={activeLightboxItem.title}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-[9999] bg-[#1C1208]/88 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full rounded-3xl overflow-hidden bg-[#FAF6EE] border border-[#D8A64F]/40 shadow-2xl"
            >
              {/* Top Lightbox Header */}
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#D8A64F]/20 bg-white">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#B6852F]">
                    {activeLightboxItem.categoryLabel}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-[#2B1A09] leading-snug">
                    {activeLightboxItem.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  aria-label="Close lightbox"
                  className="w-9 h-9 rounded-full bg-[#F5ECD8] hover:bg-[#EACF8C] text-[#2B1A09] flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lightbox Image Stage */}
              <div className="relative bg-[#1B1208] flex items-center justify-center max-h-[70vh] min-h-[280px] sm:min-h-[420px]">
                <img
                  src={activeLightboxItem.src}
                  alt={activeLightboxItem.alt}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (activeLightboxItem.fallbackSrc && !img.dataset.fb) {
                      img.dataset.fb = '1';
                      img.src = activeLightboxItem.fallbackSrc;
                    }
                  }}
                  className="max-h-[70vh] w-auto object-contain mx-auto"
                />

                {filteredItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null
                            ? 0
                            : (prev - 1 + filteredItems.length) % filteredItems.length
                        )
                      }
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#2B1A09] shadow-lg flex items-center justify-center transition-transform hover:scale-105"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((prev) =>
                          prev === null ? 0 : (prev + 1) % filteredItems.length
                        )
                      }
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#2B1A09] shadow-lg flex items-center justify-center transition-transform hover:scale-105"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Footer Counter */}
              <div className="px-5 py-2.5 flex items-center justify-between text-xs text-[#6A471A] bg-[#FAF6EE]">
                <span>{activeLightboxItem.alt}</span>
                <span className="font-semibold">
                  {(lightboxIndex ?? 0) + 1} / {filteredItems.length}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
