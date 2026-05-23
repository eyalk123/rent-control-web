import { Sun, Moon, Bell, Plus } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

interface TopBarProps {
  onOpenPalette: () => void;
  onAddClick?: () => void;
}

export function TopBar({ onOpenPalette, onAddClick }: TopBarProps) {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();

  const isDark = themeMode === 'dark' ||
    (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex items-center justify-between px-8 py-3.5 border-b border-[var(--color-outline)] bg-[var(--color-surface)] shrink-0 gap-3">
      {/* Search trigger */}
      <button
        onClick={onOpenPalette}
        className="flex flex-1 max-w-[480px] items-center gap-2 px-3 h-9 rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-input-filled-background)] text-[var(--color-placeholder)] hover:border-[var(--color-primary)]/40 transition-colors"
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
        </svg>
        <span className="flex-1 text-start text-[13px]">{t('common.searchPlaceholder')}</span>
        <span className="text-[10px] font-medium border border-[var(--color-outline)] rounded px-1.5 py-px">⌘K</span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
          title={t('common.toggleTheme')}
          className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          title={t('common.notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
        </button>

        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] bg-[var(--color-primary)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          {t('common.addButton')}
        </button>
      </div>
    </div>
  );
}
