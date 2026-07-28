import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-gold-500 selection:text-white">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
