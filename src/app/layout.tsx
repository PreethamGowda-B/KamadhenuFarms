import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.kamadhenuhoneyfarms.in'),
  title: 'Kamadhenu Honey Farms | Pure Raw Honey Bangalore',
  description: 'Buy Pure Raw Honey in Bangalore direct from beekeepers at Kamadhenu Honey Farms. Try our flagship Pure Raw Honey and Dry Fruits Honey.',
  keywords: ['Pure Honey Bangalore', 'Raw Honey Bangalore', 'Natural Honey Bangalore', 'Kamadhenu Honey Farms', 'Magadi Road Honey'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Kamadhenu Honey Farms | Pure Raw Honey Bangalore',
    description: 'Buy 100% Pure Raw Honey direct from beekeepers in Taverekere, Bangalore. Unpasteurized, zero added sugar, lab tested.',
    url: 'https://www.kamadhenuhoneyfarms.in',
    siteName: 'Kamadhenu Honey Farms',
    images: [
      {
        url: '/assets/hero_honey.jpg',
        width: 1200,
        height: 630,
        alt: 'Kamadhenu Honey Farms Pure Raw Honey',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamadhenu Honey Farms | Pure Raw Honey Bangalore',
    description: 'Buy 100% Pure Raw Honey direct from beekeepers in Taverekere, Bangalore. Fast home delivery across Bangalore & India.',
    images: ['/assets/hero_honey.jpg'],
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'EUr9nOMEsVb7sliv8BWpeWMpxsTXRJe6LROz7JKX43w',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col antialiased selection:bg-gold-500 selection:text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
