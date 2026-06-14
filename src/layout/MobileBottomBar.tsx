import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mobileNavItems } from './navConfig';

export function MobileBottomBar() {
  const { t } = useTranslation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-outline)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/home'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[var(--color-primary)]/10' : ''}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                </span>
                <span>{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
