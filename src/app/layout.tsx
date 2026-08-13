import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kamadhenu Honey Farms | Pure Raw Honey Bangalore',
  description: 'Buy Pure Raw Honey in Bangalore direct from beekeepers at Kamadhenu Honey Farms. Try our flagship Pure Raw Honey and Dry Fruits Honey.',
  keywords: ['Pure Honey Bangalore', 'Raw Honey Bangalore', 'Natural Honey Bangalore', 'Kamadhenu Honey Farms', 'Magadi Road Honey'],
  icons: {
    icon: '/favicon.ico',
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
      </body>
    </html>
  );
}
