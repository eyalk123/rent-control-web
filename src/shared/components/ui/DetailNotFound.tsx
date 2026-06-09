import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/**
 * In-page "not found" state for detail views (nonexistent ID, an ID the user
 * doesn't own, or a malformed param). Mirrors RouteErrorPage's visual style but
 * is prop-driven and i18n-aware, so it can render inside a page rather than only
 * as a router errorElement.
 */
export function DetailNotFound({ title, detail }: { title: string; detail?: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ background: 'var(--color-background)' }}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--color-error-subtle, #fef2f2)' }}>
        <AlertTriangle size={28} style={{ color: 'var(--color-error)' }} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
      {detail && <p className="mt-2 text-sm max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>{detail}</p>}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
        >
          {t('common.goBack')}
        </button>
        <button
          onClick={() => navigate('/home', { replace: true })}
          className="h-9 px-4 rounded-[9px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-primary)' }}
        >
          {t('common.goHome')}
        </button>
      </div>
    </div>
  );
}
