import { TrendingUp, TrendingDown, Users, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onNavigate: (path: string) => void;
}

const ACTIONS = [
  { labelKey: 'home.recordRevenue', icon: TrendingUp, to: '/transactions?new=revenue', color: 'var(--color-rev-fg)', bg: 'var(--color-rev-bg)' },
  { labelKey: 'home.recordExpense', icon: TrendingDown, to: '/transactions?new=expense', color: 'var(--color-exp-fg)', bg: 'var(--color-exp-bg)' },
  { labelKey: 'screens.addRenter', icon: Users, to: '/renters?new=true', color: 'var(--color-primary)', bg: 'var(--color-primary-container)' },
  { labelKey: 'screens.addProperty', icon: Building2, to: '/properties?new=true', color: 'var(--color-primary)', bg: 'var(--color-primary-container)' },
] as const;

export function QuickActions({ onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {t('home.quickActions')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ACTIONS.map(({ labelKey, icon: Icon, to, color, bg }) => (
          <button
            key={labelKey}
            onClick={() => onNavigate(to)}
            className="flex flex-col items-center gap-2.5 p-4 rounded-[var(--radius-card)] transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg }}>
              <Icon size={18} style={{ color }} strokeWidth={2} />
            </div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
