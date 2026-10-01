'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // On any admin login page (/admin/login, /login on admin subdomain, etc.), do NOT show sidebar
  const isLoginPage = !pathname || pathname === '/login' || pathname.startsWith('/login') || pathname.startsWith('/admin/login') || pathname.includes('login');

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
