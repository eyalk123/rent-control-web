import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileBottomBar } from './MobileBottomBar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { AuthTokenSync } from '@/core/auth/AuthTokenSync';

function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const segment = pathname.split('/')[1] ?? 'home';
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    document.title = `${label} — Rent Control`;
  }, [pathname]);
}

export function AppShell() {
  useDocumentTitle();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <AuthTokenSync />
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>
      <MobileBottomBar />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
