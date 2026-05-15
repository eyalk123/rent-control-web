import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Trash2, Sun, Moon, Monitor, Globe } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { useLanguage, type SupportedLanguage } from '@/hooks/useLanguage';
import { useAppAuth } from '@/core/auth/AuthContext';
import { PageContainer } from '@/shared/components/ui/PageContainer';
import { useToast } from '@/shared/components/ui/Toast';

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeMode, setThemeMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { signOut } = useAppAuth();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    if (!confirm(t('settings.signOutConfirm', 'Sign out?'))) return;
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const themeModes: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: t('settings.light', 'Light'), icon: Sun },
    { value: 'dark', label: t('settings.dark', 'Dark'), icon: Moon },
    { value: 'system', label: t('settings.system', 'System'), icon: Monitor },
  ];

  const languages: { value: SupportedLanguage; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'he', label: 'עברית' },
  ];

  return (
    <PageContainer>
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text-primary)]">{t('screens.settings')}</h1>

      <div className="max-w-lg space-y-5">
        {/* Theme */}
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.theme', 'Theme')}</p>
          <div className="flex gap-2">
            {themeModes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setThemeMode(value)}
                className={`flex flex-1 flex-col items-center gap-2 rounded-xl py-3 px-2 text-xs font-medium transition-colors ${themeMode === value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.language', 'Language')}</p>
          <div className="flex gap-2">
            {languages.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors ${language === value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-outline)]'}`}
              >
                <Globe size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-outline)] divide-y divide-[var(--color-subtle-outline)]">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 p-4 text-start hover:bg-[var(--color-input-bg)] transition-colors"
          >
            <LogOut size={16} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.signOut', 'Sign Out')}</span>
          </button>
          <button
            onClick={() => navigate('/settings/delete-account')}
            className="flex w-full items-center gap-3 p-4 text-start hover:bg-[var(--color-error)]/5 transition-colors"
          >
            <Trash2 size={16} className="text-[var(--color-error)]" />
            <span className="text-sm font-medium text-[var(--color-error)]">{t('settings.deleteAccount', 'Delete Account')}</span>
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
