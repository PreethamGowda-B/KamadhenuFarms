'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  htmlContent: string;
  docTitle: string;
  candidateName: string;
  applicationNo: string;
  verificationUrl: string;
}

export default function DocumentViewerClient({
  htmlContent,
  docTitle,
  candidateName,
  applicationNo,
  verificationUrl,
}: Props) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('print') === 'true') {
        const timer = setTimeout(() => {
          window.print();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-100 font-sans print:bg-white print:p-0">
      
      {/* Top Floating Control Bar (Hidden on Print) */}
      <header className="sticky top-0 z-50 bg-neutral-900 text-white shadow-xl border-b border-amber-500/40 px-4 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-neutral-950 font-serif font-bold text-sm flex items-center justify-center shadow">
              KHF
            </div>
            <div>
              <h1 className="text-sm font-bold text-amber-400 leading-tight">{docTitle}</h1>
              <p className="text-xs text-neutral-300">
                {candidateName} &bull; <span className="font-mono text-amber-200">{applicationNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Save as PDF
            </button>

            <Link
              href={verificationUrl}
              className="bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
            >
              <span>🛡️</span> QR Badge
            </Link>
          </div>

        </div>
      </header>

      {/* Print Instructions Notice (Hidden on Print) */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900 print:hidden">
        💡 <strong>Tip for Candidates & HR:</strong> Click <strong>&quot;Print / Save as PDF&quot;</strong> above to generate a high-resolution PDF document formatted for official records.
      </div>

      {/* Main Document Content Container */}
      <main className="max-w-4xl mx-auto my-6 bg-white p-6 sm:p-12 shadow-2xl rounded-2xl border border-neutral-200 print:max-w-none print:m-0 print:p-0 print:shadow-none print:border-none print:rounded-none">
        <div 
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
          className="document-print-body"
        />
      </main>

      {/* Global CSS for Print Formatting */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, nav, footer, .print\\:hidden {
            display: none !important;
          }
          .document-print-body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
        }
      `}</style>
    </div>
  );
}
