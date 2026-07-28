import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Careers & Partner Program | Kamadhenu Honey Farms Bangalore',
  description: 'Join Kamadhenu Honey Farm as a Sales Partner. Deliver 100% pure, natural farm honey across India. High commissions, weekly incentives, and complete support.',
  keywords: ['Kamadhenu Honey Farms Careers', 'Sales Partner Bangalore', 'Commission Based Sales Job Karnataka', 'Pure Honey Distributor'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col antialiased selection:bg-gold-500 selection:text-white">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
