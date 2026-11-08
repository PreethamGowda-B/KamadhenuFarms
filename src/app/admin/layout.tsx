'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // On any admin login page (/admin/login, /login on admin subdomain, etc.), do NOT show sidebar
  const isLoginPage = !pathname || pathname === '/login' || pathname.startsWith('/login') || pathname.startsWith('/admin/login') || pathname.includes('login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col lg:flex-row">
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col lg:h-screen lg:overflow-y-auto">
        <AdminHeader
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          mobileSidebarOpen={mobileSidebarOpen}
        />
        <main className="flex-1 pb-12 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
