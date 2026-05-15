import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileBottomBar } from './MobileBottomBar';
import { AuthTokenSync } from '@/core/auth/AuthTokenSync';

function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const segment = pathname.split('/')[1] ?? 'home';
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    document.title = `${label} — rent-control`;
  }, [pathname]);
}

export function AppShell() {
  useDocumentTitle();
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <AuthTokenSync />
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>
      <MobileBottomBar />
    </div>
  );
}
