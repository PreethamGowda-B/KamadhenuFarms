'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin/login' || pathname?.startsWith('/admin/login');

  // On the standalone admin login page, do not show the sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col lg:flex-row">
      <AdminSidebar />
      <div className="flex-1 min-w-0 min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
