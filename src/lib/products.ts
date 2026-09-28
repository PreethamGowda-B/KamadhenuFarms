export interface ProductConfig {
  id: string;
  name: string;
  subtitle?: string;
  category: 'raw' | 'infused' | 'honeycomb';
  baseDesc: string;
  prices: Record<string, number>;
  image: string;
  images: string[];
  active: boolean;
  purchasable: boolean;
  inStock: boolean;
}

export const PRODUCTS: Record<string, ProductConfig> = {
  p1: {
    id: 'p1',
    name: 'Pure Raw Honey',
    subtitle: 'Direct From Our Bee Boxes',
    category: 'raw',
    baseDesc: 'Unprocessed, raw honey collected directly from pristine organic bee boxes.',
    prices: {
      '250g': 250,
      '500g': 399,
      '1kg': 749,
    },
    image: 'assets/raw_honey.jpg',
    images: [
      'assets/raw_honey.jpg',
      'assets/raw_honey_banner.jpg',
      'assets/raw_honey_pour.jpg',
      'assets/raw_honey_details.jpg',
      'assets/raw_honey_overhead.jpg',
    ],
    active: true,
    purchasable: true,
    inStock: true,
  },
  p2: {
    id: 'p2',
    name: 'Dry Fruits Honey',
    subtitle: 'Premium Dry Fruit Infusion',
    category: 'infused',
    baseDesc: 'Premium raw honey rich in hand-sorted almonds, cashews, pistachios, and walnuts.',
    prices: {
      '250g': 399,
      '500g': 599,
      '1kg': 999,
    },
    image: 'assets/dry_fruits_honey_details.jpg',
    images: [
      'assets/dry_fruits_honey_details.jpg',
      'assets/dry_fruits_honey_back.jpg',
      'assets/dry_fruits_honey_landscape.jpg',
      'assets/dry_fruits_honey.jpg',
    ],
    active: true,
    purchasable: true,
    inStock: true,
  },
  p3: {
    id: 'p3',
    name: 'Bee-Crafted Honey Comb Jar',
    subtitle: 'Built by Bees. Not by Machines.',
    category: 'honeycomb',
    baseDesc: 'A unique innovation where bees naturally build honeycomb directly inside a glass jar and fill it with pure raw honey. Harvested exactly as nature intended.',
    prices: {
      '500g': 599,
    },
    image: 'assets/ChatGPT Image Jun 13, 2026, 07_29_45 PM.png',
    images: [
      'assets/ChatGPT Image Jun 13, 2026, 07_29_45 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_31_52 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_36_11 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_51_53 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_54_12 PM.png',
    ],
    active: true,
    purchasable: true,
    inStock: true,
  },
  p4: {
    id: 'p4',
    name: 'Raw Honey Comb Box',
    subtitle: 'Straight From The Hive.',
    category: 'honeycomb',
    baseDesc: 'Fresh honeycomb harvested directly from our hives and packed carefully to preserve its natural taste, aroma, and nutrients.',
    prices: {
      '500g': 899,
    },
    image: 'assets/ChatGPT Image Jun 13, 2026, 07_39_22 PM.png',
    images: [
      'assets/ChatGPT Image Jun 13, 2026, 07_39_22 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_42_34 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_43_33 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_46_15 PM.png',
      'assets/ChatGPT Image Jun 13, 2026, 07_47_14 PM.png',
    ],
    active: true,
    purchasable: true,
    inStock: true,
  },
};

export const AUTHORITATIVE_PRICES: Record<string, { name: string; prices: Record<string, number> }> = {
  p1: { name: PRODUCTS.p1.name, prices: PRODUCTS.p1.prices },
  p2: { name: PRODUCTS.p2.name, prices: PRODUCTS.p2.prices },
  p3: { name: PRODUCTS.p3.name, prices: PRODUCTS.p3.prices },
  p4: { name: PRODUCTS.p4.name, prices: PRODUCTS.p4.prices },
};

export function getProduct(id: string): ProductConfig | null {
  return PRODUCTS[id] || null;
}

export function getAllActiveProducts(): ProductConfig[] {
  return Object.values(PRODUCTS).filter((p) => p.active);
}
