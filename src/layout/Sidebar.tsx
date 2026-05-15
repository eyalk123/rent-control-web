import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppAuth } from '@/core/auth/AuthContext';
import { mainNavItems } from './navConfig';
import { Building2 } from 'lucide-react';

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAppAuth();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-e border-[var(--color-outline)] bg-[var(--color-surface)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-outline)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="font-semibold text-[var(--color-text-primary)] text-sm tracking-tight">rent-control</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)] hover:text-[var(--color-text-primary)]'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-[var(--color-outline)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] text-[var(--color-avatar-text)] text-xs font-semibold border border-[var(--color-avatar-border)]">
              {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                {user.displayName ?? user.email}
              </p>
              {user.displayName && (
                <p className="truncate text-xs text-[var(--color-text-secondary)]">{user.email}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
