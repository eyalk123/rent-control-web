import { Sun, Moon, Bell, Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useAlertsPanel } from '@/features/alerts/AlertsPanelContext';
import { useChatPanel } from '@/features/agent/PortfolioChatContext';
import { useAgentStatus } from '@/features/agent/queries';

interface TopBarProps {
  onOpenPalette: () => void;
}

export function TopBar({ onOpenPalette }: TopBarProps) {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const { openPanel, hasAlerts } = useAlertsPanel();
  const { open: openChat } = useChatPanel();
  const { data: agentStatus } = useAgentStatus();

  const isDark = themeMode === 'dark' ||
    (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex items-center justify-between px-4 lg:px-8 py-3.5 border-b border-[var(--color-outline)] bg-[var(--color-surface)] shrink-0 gap-3">
      {/* Search trigger */}
      <button
        onClick={onOpenPalette}
        className="flex flex-1 max-w-[480px] items-center gap-2 px-3 h-11 lg:h-9 rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-input-filled-background)] text-[var(--color-placeholder)] hover:border-[var(--color-primary)]/40 transition-colors"
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
        </svg>
        {/* The full placeholder wraps to three lines at 390px and spills out of the bar,
            so mobile gets the short label. `truncate` guards narrower devices still. */}
        <span className="flex-1 min-w-0 truncate text-start text-[13px] lg:hidden">{t('common.search')}</span>
        <span className="flex-1 min-w-0 truncate text-start text-[13px] hidden lg:inline">{t('common.searchPlaceholder')}</span>
        {/* ⌘K is meaningless without a keyboard (and mirrors to "K⌘" in RTL). */}
        <span className="hidden lg:inline text-[10px] font-medium border border-[var(--color-outline)] rounded px-1.5 py-px">⌘K</span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {agentStatus?.enabled && (
          <button
            onClick={openChat}
            title={t('agent.launcher')}
            aria-label={t('agent.launcher')}
            className="flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-primary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
          >
            <Sparkles size={16} aria-hidden="true" />
          </button>
        )}

        <button
          onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
          title={t('common.toggleTheme')}
          aria-label={t('common.toggleTheme')}
          className="flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
        >
          {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>

        <button
          onClick={openPanel}
          title={t('common.notifications')}
          aria-label={t('common.notifications')}
          className="relative flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-[9px] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-input-filled-background)] transition-colors"
        >
          <Bell size={16} aria-hidden="true" />
          {hasAlerts && <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />}
        </button>

      </div>
    </div>
  );
}
