import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Wallet, BarChart2, Store, Settings,
  Plus, TrendingUp, TrendingDown, Search, ArrowRight, ArrowLeft, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProperties } from '@/features/properties/queries';
import { useRenters } from '@/features/renters/queries';
import { useLanguage } from '@/hooks/useLanguage';

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

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRtl } = useLanguage();
  const { data: properties = [] } = useProperties();
  const { data: renters = [] } = useRenters();

  const pagesGroup = t('common.palette.pagesGroup');
  const actionsGroup = t('common.palette.actionsGroup');
  const propertiesGroup = t('tabs.properties');
  const rentersGroup = t('tabs.renters');

  const GROUP_ORDER = [pagesGroup, actionsGroup, propertiesGroup, rentersGroup];

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
    { group: pagesGroup, label: t('tabs.home'),         icon: LayoutDashboard, action: () => go('/home') },
    { group: pagesGroup, label: t('tabs.properties'),   icon: Building2,       action: () => go('/properties') },
    { group: pagesGroup, label: t('tabs.renters'),      icon: Users,           action: () => go('/renters') },
    { group: pagesGroup, label: t('tabs.transactions'), icon: Wallet,          action: () => go('/transactions') },
    { group: pagesGroup, label: t('tabs.suppliers'),    icon: Store,           action: () => go('/suppliers') },
    { group: pagesGroup, label: t('tabs.reports'),      icon: BarChart2,       action: () => go('/reports') },
    { group: pagesGroup, label: t('tabs.settings'),     icon: Settings,        action: () => go('/settings') },

    { group: actionsGroup, label: t('common.addProperty'),      icon: Plus,        action: () => go('/properties') },
    { group: actionsGroup, label: t('common.addRenter'),        icon: Plus,        action: () => go('/renters') },
    { group: actionsGroup, label: t('home.recordRevenue'),      icon: TrendingUp,  action: () => go('/transactions') },
    { group: actionsGroup, label: t('home.recordExpense'),      icon: TrendingDown,action: () => go('/transactions') },
    { group: actionsGroup, label: t('common.addSupplier'),      icon: Store,       action: () => go('/suppliers') },
    { group: actionsGroup, label: t('home.reportGenerateNew'),  icon: FileText,    action: () => go('/reports') },

    ...properties.map((p) => ({
      group: propertiesGroup,
      label: p.address,
      sub: p.city,
      icon: Building2 as LucideIcon,
      action: () => go(`/properties/${p.id}`),
    })),

    ...renters.map((r) => ({
      group: rentersGroup,
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

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('common.palette.search')}
        className="relative w-[600px] max-w-[calc(100%-2rem)] max-h-[540px] bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-[14px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--color-outline)]">
          <Search size={16} className="text-[var(--color-text-secondary)] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.palette.search')}
            aria-label={t('common.palette.search')}
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
                    <item.icon size={16} className="text-[var(--color-text-secondary)] shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-[13.5px] font-medium text-[var(--color-text-primary)]">{item.label}</span>
                    {item.sub && <span className="text-xs text-[var(--color-text-secondary)]">{item.sub}</span>}
                    {isRtl
                      ? <ArrowLeft size={13} className="text-[var(--color-placeholder)] shrink-0" aria-hidden="true" />
                      : <ArrowRight size={13} className="text-[var(--color-placeholder)] shrink-0" aria-hidden="true" />
                    }
                  </button>
                ))}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
              {t('common.palette.noMatches')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
