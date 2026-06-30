import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { ReviewItem } from '../types';

/** Scroll to a flagged field and focus it. Inputs registered with RHF expose a `name`
 *  attribute; controlled controls (select/date) are matched by an id we set to the form key. */
function jumpTo(formKey: string) {
  const el =
    document.querySelector<HTMLElement>(`[name="${CSS.escape(formKey)}"]`) ??
    document.getElementById(`scan-field-${formKey}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (typeof (el as HTMLInputElement).focus === 'function') {
    (el as HTMLInputElement).focus({ preventScroll: true });
  }
}

/** Compact summary atop a prefilled form: how many fields the model was unsure about, with
 *  chips that jump to each one (the field itself shows the value + source inline). */
export function ReviewBanner({ items }: { items?: ReviewItem[] }) {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;
  return (
    <div
      className="flex gap-2 rounded-xl px-3.5 py-2.5 text-[13px]"
      style={{ background: 'var(--color-warning-bg, rgba(234,179,8,0.12))', color: 'var(--color-text-primary)', border: '1px solid var(--color-warning, #eab308)' }}
    >
      <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warning, #eab308)' }} />
      <div className="flex flex-col gap-2 min-w-0">
        <p className="font-medium">{t('documentScan.reviewCount', { count: items.length })}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <button
              key={`${item.formKey}-${i}`}
              type="button"
              onClick={() => jumpTo(item.formKey)}
              title={t('documentScan.jumpToField')}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-warning, #eab308)', color: 'var(--color-text-secondary)' }}
            >
              {t(item.field, { defaultValue: item.field })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
