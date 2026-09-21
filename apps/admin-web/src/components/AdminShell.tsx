'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { AdminWebSocketListener } from '@/components/AdminWebSocketListener';

interface AdminShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'الطلبات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    href: '/users',
    label: 'العملاء',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/runners',
    label: 'المندوبين',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: '/settlements',
    label: 'التسويات المالية',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState<string>('المدير');
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('adminName') || localStorage.getItem('userName');
      if (name) setAdminName(name);
    }
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Proceed with local cleanup even if API fails
    } finally {
      if (typeof window !== 'undefined') {
        ['accessToken', 'refreshToken', 'tokenExpiry', 'userId', 'userName', 'adminName', 'userRole'].forEach(
          (key) => localStorage.removeItem(key),
        );
        if (typeof document !== 'undefined') {
          const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
          document.cookie = `accessToken=; path=/; max-age=0; SameSite=Lax;${secure}`;
          document.cookie = `tokenExpiry=; path=/; max-age=0; SameSite=Lax;${secure}`;
        }
        window.location.href = '/login?logout=true';
      }
    }
  };

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex" dir="rtl">
      <AdminWebSocketListener />

      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-sm z-20">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00C1A7] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-[#00C1A7] tracking-tight">FORERUN</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">فَوْراً</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">لوحة الإدارة المركزية</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#00C1A7]/10 text-[#008f7a] font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-[#00C1A7]' : 'text-slate-500'}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Operational System Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>الخادم متصل (دمشق GMT+3)</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-800">FORERUN Admin</h1>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">نظام إدارة التوصيل والعمليات</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#00C1A7]"></span>
              <span>مرحباً، {adminName}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{isLoggingOut ? 'جاري الخروج...' : 'تسجيل الخروج'}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
