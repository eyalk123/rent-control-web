import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Trash2, Sun, Globe, User, Shield, Info, FileText, Bell } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { useLanguage, type SupportedLanguage } from '@/hooks/useLanguage';
import { useAppAuth } from '@/core/auth/AuthContext';
import { SegToggle } from '@/shared/components/ui/SegToggle';
import { useToast } from '@/shared/components/ui/Toast';

// ─── DeleteAccountModal ──────────────────────────────────────────────────────

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deleteFirebaseAccount } = useAppAuth();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const canDelete = confirmText === 'DELETE';
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Dialog a11y: close on Escape, focus the input on open, restore focus on close.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      await deleteFirebaseAccount();
      navigate('/sign-in', { replace: true });
    } catch {
      showToast(t('error.saveFailed'), 'error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-[var(--radius-card)] p-6 shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-[18px] font-bold mb-1" style={{ color: 'var(--color-error)' }}>{t('settings.deleteAccount')}</h2>
        <p className="text-[13.5px] mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('settings.deleteAccountPermanent')}
        </p>
        <ul className="space-y-1 mb-5">
          {[t('settings.deleteAccountItem1'), t('settings.deleteAccountItem2'), t('settings.deleteAccountItem3'), t('settings.deleteAccountItem4')].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-error)' }} />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('settings.deleteAccountConfirmLabel')}</p>
        <input
          ref={inputRef}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={t('settings.deleteAccountConfirmPlaceholder')}
          aria-label={t('settings.deleteAccountConfirmLabel')}
          className="h-10 w-full rounded-[9px] px-3 text-sm outline-none mb-4 font-mono"
          style={{ background: 'var(--color-input-filled-background)', border: `1px solid ${canDelete ? 'var(--color-error)' : 'var(--color-outline)'}`, color: 'var(--color-text-primary)' }}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-[9px] text-[13px] font-medium" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="h-9 px-4 rounded-[9px] text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--color-error)' }}
          >
            {loading ? '…' : t('settings.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function SettingsSection({ id, title, subtitle, danger = false, children }: { id?: string; title: string; subtitle?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 20 }}>
      <div className="mb-3">
        <h2 className="text-[16px] font-black tracking-tight" style={{ color: danger ? 'var(--color-error)' : 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>{title}</h2>
        {subtitle && <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      </div>
      <div className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: `1px solid ${danger ? 'var(--color-error)' : 'var(--color-outline)'}` }}>
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, hint, control, last = false }: { label: string; hint?: string; control: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
        {hint && <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeMode, setThemeMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { signOut, user } = useAppAuth();
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSignOut = async () => {
    if (!confirm(t('settings.signOutConfirm'))) return;
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const NAV_ITEMS = [
    { key: 'account', label: t('settings.navAccount'), icon: User },
    { key: 'notifications', label: t('common.notifications'), icon: Bell },
    { key: 'appearance', label: t('settings.navAppearance'), icon: Sun },
    { key: 'language', label: t('settings.navLanguage'), icon: Globe },
    { key: 'data', label: t('settings.navData'), icon: Shield },
    { key: 'legal', label: t('legal.sectionTitle'), icon: FileText },
    { key: 'about', label: t('settings.navAbout'), icon: Info },
  ];

  const legalLinkClass = 'inline-flex items-center h-8 px-3 rounded-[8px] text-[12px] font-medium';
  const legalLinkStyle: React.CSSProperties = { border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', textDecoration: 'none' };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="pb-4 mb-6" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('screens.settings')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.headerSubtitle')}</p>
      </div>

      <div className="grid gap-10" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Side nav */}
        <nav className="flex flex-col gap-0.5 sticky top-4 self-start">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <a
              key={key}
              href={`#${key}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] font-medium transition-colors hover:bg-[var(--color-input-filled-background)]"
              style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}
            >
              <Icon size={15} style={{ color: 'var(--color-text-secondary)' }} />
              {label}
            </a>
          ))}
        </nav>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {/* Account */}
          <SettingsSection id="account" title={t('settings.account')}>
            <div className="flex items-center gap-4 p-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold" style={{ background: 'var(--color-primary-container)', color: 'var(--color-primary)' }}>
                {(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{user?.displayName ?? t('settings.user')}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
              </div>
            </div>
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection id="notifications" title={t('common.notifications')} subtitle={t('notifications.subtitle')}>
            <SettingRow
              label={t('notifications.manageTitle')}
              hint={t('notifications.manageHint')}
              control={<Link to="/settings/notifications" className={legalLinkClass} style={legalLinkStyle}>{t('notifications.manage')}</Link>}
              last
            />
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection id="appearance" title={t('settings.appearance')} subtitle={t('settings.appearanceSubtitle')}>
            <SettingRow
              label={t('settings.theme')}
              hint={t('settings.themeHint')}
              control={
                <SegToggle
                  value={themeMode}
                  onChange={(v) => setThemeMode(v as ThemeMode)}
                  options={[
                    { value: 'light', label: t('settings.light') },
                    { value: 'dark', label: t('settings.dark') },
                    { value: 'system', label: t('settings.system') },
                  ]}
                  size="sm"
                />
              }
              last
            />
          </SettingsSection>

          {/* Language */}
          <SettingsSection id="language" title={t('settings.language')} subtitle={t('settings.languageSubtitle')}>
            <SettingRow
              label={t('settings.appLanguage')}
              control={
                <SegToggle
                  value={language}
                  onChange={(v) => setLanguage(v as SupportedLanguage)}
                  options={[
                    { value: 'en', label: t('settings.languageEn') },
                    { value: 'he', label: 'עברית' },
                  ]}
                  size="sm"
                />
              }
              last
            />
          </SettingsSection>

          {/* Data */}
          <SettingsSection id="data" title={t('settings.dataPrivacy')}>
            <SettingRow
              label={t('settings.currency')}
              hint={t('settings.currencyHint')}
              control={<span className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.currencyValue')}</span>}
              last
            />
            {/* "Export data" row hidden until the export feature is implemented (S3). */}
          </SettingsSection>

          {/* Legal & Privacy */}
          <SettingsSection id="legal" title={t('legal.sectionTitle')}>
            <SettingRow
              label={t('legal.privacyPolicy')}
              control={<Link to="/privacy" className={legalLinkClass} style={legalLinkStyle}>{t('legal.open')}</Link>}
            />
            <SettingRow
              label={t('legal.termsOfService')}
              control={<Link to="/terms" className={legalLinkClass} style={legalLinkStyle}>{t('legal.open')}</Link>}
            />
            <SettingRow
              label={t('legal.accessibility')}
              control={<Link to="/accessibility" className={legalLinkClass} style={legalLinkStyle}>{t('legal.open')}</Link>}
              last
            />
          </SettingsSection>

          {/* About */}
          <SettingsSection id="about" title={t('settings.about')}>
            <SettingRow label={t('settings.versionLabel')} control={<span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.versionValue')}</span>} />
            <SettingRow label={t('settings.platformLabel')} control={<span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('settings.platformValue')}</span>} last />
          </SettingsSection>

          {/* Danger zone */}
          <SettingsSection title={t('settings.dangerZone')} danger>
            <SettingRow
              label={t('settings.signOut')}
              hint={t('settings.signOutHint')}
              control={
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-medium transition-colors"
                  style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
                >
                  <LogOut size={14} /> {t('settings.signOut')}
                </button>
              }
            />
            <SettingRow
              label={t('settings.deleteAccount')}
              hint={t('settings.deleteAccountHint')}
              control={
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--color-error)' }}
                >
                  <Trash2 size={14} /> {t('settings.deleteAccount')}
                </button>
              }
              last
            />
          </SettingsSection>
        </div>
      </div>

      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </div>
  );
}
