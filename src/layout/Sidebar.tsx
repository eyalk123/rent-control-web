import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppAuth } from '@/core/auth/AuthContext';
import { mainNavItems, bottomNavItems } from './navConfig';
import { Building2, TrendingUp } from 'lucide-react';
import { useTransactionSummary } from '@/features/transactions/queries';
import { formatMoney } from '@/shared/utils/money';

function NavBtn({ icon: Icon, labelKey, path }: { icon: React.ElementType; labelKey: string; path: string }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={path}
      end={path === '/home'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] transition-colors ${
          isActive
            ? 'bg-[var(--color-brand-navy)] text-white font-semibold'
            : 'text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-input-filled-background)] hover:text-[var(--color-text-primary)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} strokeWidth={isActive ? 2 : 1.7} />
          <span className="flex-1">{t(labelKey)}</span>
        </>
      )}
    </NavLink>
  );
}

function IconNavBtn({ icon: Icon, labelKey, path }: { icon: React.ElementType; labelKey: string; path: string }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={path}
      end={path === '/home'}
      title={t(labelKey)}
      className={({ isActive }) =>
        `flex h-11 w-11 items-center justify-center rounded-[9px] transition-colors ${
          isActive
            ? 'bg-[var(--color-brand-navy)] text-white'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-input-filled-background)] hover:text-[var(--color-text-primary)]'
        }`
      }
    >
      {({ isActive }) => <Icon size={19} strokeWidth={isActive ? 2 : 1.7} />}
    </NavLink>
  );
}

export function Sidebar() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const { data: summary } = useTransactionSummary();

  const bucket = summary?.six_month_buckets?.at(-1);
  const profit = bucket ? bucket.revenue - bucket.expenses : null;
  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(/[\s@]+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Wide sidebar — ≥1280px */}
      <aside className="hidden 2xl:flex flex-col w-[252px] shrink-0 h-screen sticky top-0 border-e border-[var(--color-outline)] bg-[var(--color-surface)]">
        <div
          onClick={() => navigate('/home')}
          className="flex items-center gap-2.5 px-4 py-5 cursor-pointer"
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-navy)]">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">Rent Control</div>
            <div className="text-[10.5px] text-[var(--color-text-secondary)]">
              {user?.displayName ?? user?.email?.split('@')[0]} · personal
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3.5 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavBtn key={item.path} {...item} />
          ))}
          <div className="mt-3.5 mb-1.5 px-3 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest">
            Manage
          </div>
          {bottomNavItems.map((item) => (
            <NavBtn key={item.path} {...item} />
          ))}
        </nav>

        {profit !== null && (
          <div className="mx-3.5 mb-3 rounded-[10px] bg-[var(--color-input-filled-background)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              This month
            </p>
            <p className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
              {formatMoney(profit)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-success)]">
              <TrendingUp size={12} /> net profit
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 px-4 py-3.5 border-t border-[var(--color-outline)] hover:bg-[var(--color-input-filled-background)] transition-colors text-start"
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-background)] text-[var(--color-avatar-text)] text-xs font-semibold border border-[var(--color-avatar-border)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
              {user?.displayName ?? user?.email}
            </p>
            {user?.displayName && (
              <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{user.email}</p>
            )}
          </div>
        </button>
      </aside>

      {/* Icon sidebar — 1024px–1280px */}
      <aside className="hidden lg:flex 2xl:hidden flex-col w-16 shrink-0 h-screen sticky top-0 border-e border-[var(--color-outline)] bg-[var(--color-surface)] py-4">
        <div
          onClick={() => navigate('/home')}
          className="flex h-9 w-9 mx-auto mb-5 items-center justify-center rounded-[9px] bg-[var(--color-brand-navy)] cursor-pointer"
        >
          <Building2 size={18} className="text-white" />
        </div>

        <nav className="flex flex-col gap-1 px-2.5 flex-1">
          {mainNavItems.map((item) => (
            <IconNavBtn key={item.path} {...item} />
          ))}
        </nav>

        <div className="flex flex-col gap-1 px-2.5 pb-2">
          {bottomNavItems.map((item) => (
            <IconNavBtn key={item.path} {...item} />
          ))}
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 mx-auto mt-2 items-center justify-center rounded-full bg-[var(--color-avatar-background)] text-[var(--color-avatar-text)] text-[11px] font-semibold border border-[var(--color-avatar-border)] hover:opacity-80 transition-opacity"
          title={user?.displayName ?? user?.email ?? 'Settings'}
        >
          {initials}
        </button>
      </aside>
    </>
  );
}
