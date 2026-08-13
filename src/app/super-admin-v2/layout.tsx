'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider, useSessionContext } from '@/components/admin/SessionProvider';
import { Button } from '@/components/ui/Button';

function AdminSidebar() {
  const { activeSession } = useSessionContext();
  const pathname = usePathname();

  const zoneNav = [
    { name: 'Dashboard', href: '/super-admin-v2' },
    { name: 'Zones', href: '/super-admin-v2/zones' },
    { name: 'Institutions', href: '/super-admin-v2/institutions' },
    { name: 'Students', href: '/super-admin-v2/students' },
    { name: 'Programmes', href: '/super-admin-v2/programmes' },
    { name: 'Schedule', href: '/super-admin-v2/schedule' },
    { name: 'Results', href: '/super-admin-v2/results' },
    { name: 'Qualifications', href: '/super-admin-v2/qualifications' },
  ];

  const stateNav = [
    { name: 'Dashboard', href: '/super-admin-v2' },
    { name: 'Qualified Students', href: '/super-admin-v2/state/qualified' },
    { name: 'Confirmations', href: '/super-admin-v2/state/confirmations' },
    { name: 'Programmes', href: '/super-admin-v2/state/programmes' },
    { name: 'Schedule', href: '/super-admin-v2/state/schedule' },
    { name: 'Jury', href: '/super-admin-v2/state/jury' },
    { name: 'Media', href: '/super-admin-v2/state/media' },
    { name: 'Results', href: '/super-admin-v2/state/results' },
    { name: 'Live Control', href: '/super-admin-v2/state/live' },
  ];

  const navItems = activeSession === 'ZONE' ? zoneNav : stateNav;

  return (
    <aside className="w-64 bg-white border-r border-[#E0E0E0] min-h-screen flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold text-[#800000] mb-6">Hiya Fiesta 2026</h2>
        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-[#800000]/10 text-[#800000] font-medium' 
                    : 'text-[#424242] hover:bg-[#F5F5F5]'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  );
}

function TopBar() {
  const { activeSession, setActiveSession } = useSessionContext();

  return (
    <header className="h-16 bg-white border-b border-[#E0E0E0] flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center space-x-2 bg-[#F5F5F5] p-1 rounded-lg border border-[#E0E0E0]">
        <button
          onClick={() => setActiveSession('ZONE')}
          className={`px-6 py-1.5 rounded-md text-sm font-semibold transition-all ${
            activeSession === 'ZONE' 
              ? 'bg-white text-[#800000] shadow-sm' 
              : 'text-[#757575] hover:text-[#1A1A1A]'
          }`}
        >
          ZONE FEST
        </button>
        <button
          onClick={() => setActiveSession('STATE')}
          className={`px-6 py-1.5 rounded-md text-sm font-semibold transition-all ${
            activeSession === 'STATE' 
              ? 'bg-[#800000] text-white shadow-sm' 
              : 'text-[#757575] hover:text-[#1A1A1A]'
          }`}
        >
          STATE FEST
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-sm text-[#424242]">Super Admin</div>
        <div className="h-8 w-8 rounded-full bg-[#800000] text-white flex items-center justify-center text-sm font-bold">
          SA
        </div>
      </div>
    </header>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-[#FAFAFA]">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
