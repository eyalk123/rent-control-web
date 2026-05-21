import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Wallet, BarChart2, Store, Settings,
  Plus, TrendingUp, TrendingDown, Search, ArrowRight, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProperties } from '@/features/properties/queries';
import { useRenters } from '@/features/renters/queries';

interface PaletteItem {
  group: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const GROUP_ORDER = ['Pages', 'Actions', 'Properties', 'Renters'];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: properties = [] } = useProperties();
  const { data: renters = [] } = useRenters();

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const go = (path: string) => { navigate(path); onClose(); };

  const allItems: PaletteItem[] = [
    { group: 'Pages', label: 'Home',         icon: LayoutDashboard, action: () => go('/home') },
    { group: 'Pages', label: 'Properties',   icon: Building2,       action: () => go('/properties') },
    { group: 'Pages', label: 'Renters',      icon: Users,           action: () => go('/renters') },
    { group: 'Pages', label: 'Transactions', icon: Wallet,          action: () => go('/transactions') },
    { group: 'Pages', label: 'Suppliers',    icon: Store,           action: () => go('/suppliers') },
    { group: 'Pages', label: 'Reports',      icon: BarChart2,       action: () => go('/reports') },
    { group: 'Pages', label: 'Settings',     icon: Settings,        action: () => go('/settings') },

    { group: 'Actions', label: 'Add property',   icon: Plus,        action: () => go('/properties/add') },
    { group: 'Actions', label: 'Add renter',     icon: Plus,        action: () => go('/renters/add') },
    { group: 'Actions', label: 'Record revenue', icon: TrendingUp,  action: () => go('/transactions/add?type=revenue') },
    { group: 'Actions', label: 'Record expense', icon: TrendingDown,action: () => go('/transactions/add?type=expense') },
    { group: 'Actions', label: 'Add supplier',   icon: Store,       action: () => go('/suppliers/add') },
    { group: 'Actions', label: 'Generate report',icon: FileText,    action: () => go('/reports') },

    ...properties.map((p) => ({
      group: 'Properties',
      label: p.address,
      sub: p.city,
      icon: Building2 as LucideIcon,
      action: () => go(`/properties/${p.id}`),
    })),

    ...renters.map((r) => ({
      group: 'Renters',
      label: `${r.first_name} ${r.last_name}`,
      sub: r.property?.address,
      icon: Users as LucideIcon,
      action: () => go(`/renters/${r.id}`),
    })),
  ];

  const q = query.toLowerCase();
  const filtered = q
    ? allItems.filter((i) =>
        i.label.toLowerCase().includes(q) || (i.sub ?? '').toLowerCase().includes(q)
      )
    : allItems;

  const grouped: Record<string, PaletteItem[]> = {};
  filtered.forEach((i) => {
    (grouped[i.group] ??= []).push(i);
  });

  return (
    <div className="fixed inset-0 z-[80] flex justify-center" style={{ paddingTop: '12vh' }}>
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(15,23,42,0.36)]" aria-hidden />

      <div className="relative w-[600px] max-w-[calc(100%-2rem)] max-h-[540px] bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-[14px] overflow-hidden flex flex-col shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--color-outline)]">
          <Search size={16} className="text-[var(--color-text-secondary)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, property or person…"
            className="flex-1 border-0 outline-none text-sm text-[var(--color-text-primary)] bg-transparent placeholder:text-[var(--color-placeholder)]"
          />
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)] border border-[var(--color-outline)] rounded px-1.5 py-px">esc</span>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-2">
          {GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items?.length) return null;
            return (
              <div key={group}>
                <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {group}
                </div>
                {items.map((item, i) => (
                  <button
                    key={group + i}
                    onClick={item.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-input-filled-background)] transition-colors text-start"
                  >
                    <item.icon size={16} className="text-[var(--color-text-secondary)] shrink-0" />
                    <span className="flex-1 text-[13.5px] font-medium text-[var(--color-text-primary)]">{item.label}</span>
                    {item.sub && <span className="text-xs text-[var(--color-text-secondary)]">{item.sub}</span>}
                    <ArrowRight size={13} className="text-[var(--color-placeholder)] shrink-0" />
                  </button>
                ))}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              No matches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
