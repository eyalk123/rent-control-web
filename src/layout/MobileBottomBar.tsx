import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { mobileNavItems, mobileMoreItems } from './navConfig';

const tabClass = (isActive: boolean) =>
  `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
  }`;

export function MobileBottomBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // A destination in the sheet is currently active — reflect that on the More tab.
  const moreActive = mobileMoreItems.some((i) => location.pathname.startsWith(i.path));

  // Close the sheet whenever we navigate.
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // Close on Escape and on outside click.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMoreOpen(false); moreBtnRef.current?.focus(); }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!sheetRef.current?.contains(target) && !moreBtnRef.current?.contains(target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40" aria-hidden />
          <div
            ref={sheetRef}
            role="dialog"
            aria-label={t('tabs.more')}
            className="lg:hidden fixed inset-x-0 bottom-[68px] z-40 border-t border-[var(--color-outline)] bg-[var(--color-surface)] p-2 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            {mobileMoreItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[9px] px-4 min-h-11 text-[14px] font-medium no-underline transition-colors ${
                    isActive ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-primary)]'
                  }`
                }
              >
                <item.icon size={19} aria-hidden="true" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        </>
      )}

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
              className={({ isActive }) => tabClass(isActive)}
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

          <button
            ref={moreBtnRef}
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={tabClass(moreActive || moreOpen)}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${moreActive || moreOpen ? 'bg-[var(--color-primary)]/10' : ''}`}>
              <MoreHorizontal size={20} strokeWidth={moreActive || moreOpen ? 2 : 1.75} />
            </span>
            <span>{t('tabs.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
