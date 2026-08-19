import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppAuth } from '@/core/auth/AuthContext';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { mainNavItems, bottomNavItems } from './navConfig';
import logoImage from '@/assets/rent-control-icon-no-text.png';
import { useTransactionSummary } from '@/features/transactions/queries';
import { formatMoney } from '@/shared/utils/money';
import { Skeleton } from '@/shared/components/ui/Skeleton';

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
      aria-label={t(labelKey)}
      className={({ isActive }) =>
        `flex h-11 w-11 items-center justify-center rounded-[9px] transition-colors ${
          isActive
            ? 'bg-[var(--color-brand-navy)] text-white'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-input-filled-background)] hover:text-[var(--color-text-primary)]'
        }`
      }
    >
      {({ isActive }) => <Icon size={19} strokeWidth={isActive ? 2 : 1.7} aria-hidden="true" />}
    </NavLink>
  );
}

/** Net figures read green above water, red below — same rule as the income/expense report. */
function netColor(net: number): string {
  return net >= 0 ? 'var(--color-rev-fg)' : 'var(--color-exp-fg)';
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useTransactionSummary();

  const byOwner = summary?.ytd_by_owner ?? [];
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
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label={t('tabs.home')}
          className="flex w-full items-center gap-2.5 px-4 py-5 cursor-pointer text-start"
        >
          <img src={logoImage} alt="" className="h-[34px] w-[34px] shrink-0 rounded-lg object-contain" />
          <div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight">Rent Control</div>
            <div className="text-[10.5px] text-[var(--color-text-secondary)]">
              {user?.displayName ?? user?.email?.split('@')[0]} · {t('common.personal')}
            </div>
          </div>
        </button>

        <nav className="flex-1 flex flex-col gap-0.5 px-3.5 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavBtn key={item.path} {...item} />
          ))}
          <div className="mt-3.5 mb-1.5 px-3 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest">
            {t('common.manage')}
          </div>
          {bottomNavItems.map((item) => (
            <NavBtn key={item.path} {...item} />
          ))}
        </nav>

        {summaryLoading ? (
          <div className="mx-3.5 mb-3 rounded-[10px] bg-[var(--color-input-filled-background)] p-3">
            <Skeleton width="55%" height={10} className="block" />
            <Skeleton width="70%" height={22} className="block mt-2" />
            <Skeleton width="45%" height={11} className="block mt-2" />
          </div>
        ) : summary && (
          <div className="mx-3.5 mb-3 rounded-[10px] bg-[var(--color-input-filled-background)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
              {t('home.ytdNet', { year: summary.ytd_year })}
            </p>
            <LtrSpan
              className="text-[22px] font-bold tracking-tight leading-none block"
              style={{ color: netColor(summary.ytd_net) }}
            >
              {formatMoney(summary.ytd_net)}
            </LtrSpan>
            {/* One line is what the total already says — only split when there is a split. */}
            {byOwner.length > 1 && (
              <ul className="mt-2.5 flex flex-col gap-1 border-t border-[var(--color-outline)] pt-2">
                {byOwner.map((entry) => (
                  <li
                    key={entry.owner ?? '__none__'}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[var(--color-text-secondary)]">
                      {entry.owner ?? t('reports.noOwner')}
                    </span>
                    <LtrSpan className="font-semibold" style={{ color: netColor(entry.net) }}>
                      {formatMoney(entry.net)}
                    </LtrSpan>
                  </li>
                ))}
              </ul>
            )}
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
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label={t('tabs.home')}
          className="mx-auto mb-5 block"
        >
          <img src={logoImage} alt="" className="h-9 w-9 rounded-[9px] object-contain" />
        </button>

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
