import ApplicationForm from '@/components/careers/ApplicationForm';
import Link from 'next/link';

export default function ApplyPage() {
  return (
    <div className="py-12 bg-cream-bg min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-6">
          <Link href="/careers" className="text-xs font-semibold text-gold-600 hover:underline">
            ← Back to Careers Landing Page
          </Link>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
            Official Application Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal">
            Join Sales Partner Network
          </h1>
          <p className="text-sm text-gray-600">
            Fill out the 4 steps below. Complete submission takes less than 3 minutes.
          </p>
        </div>

        <ApplicationForm />

      </div>
    </div>
  );
}
