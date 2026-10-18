import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoTip } from '@/shared/components/ui/InfoTip';

interface Props {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
  last?: boolean;
  /** Explains a computed or easily misread field, behind an (i) beside the label. */
  info?: ReactNode;
}

export function DetailRow({ icon: Icon, label, value, href, last = false, info }: Props) {
  if (!value) return null;
  const valueEl = href ? (
    <a href={href} className="text-[13px] font-semibold hover:underline" style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</a>
  ) : (
    <span className="text-[13px] font-semibold text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  );
  return (
    <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <Icon size={15} style={{ color: 'var(--color-brand-navy-fg)' }} strokeWidth={1.6} />
      <DetailLabel label={label} info={info} />
      {valueEl}
    </div>
  );
}

/**
 * A detail row's label, with its (i) when there is something to explain. Exported for the
 * rows that lay out their own value (a value with a date under it, buttons beside it).
 */
export function DetailLabel({ label, sub, info }: { label: string; sub?: string; info?: ReactNode }) {
  const { t } = useTranslation();
  const text = sub ? (
    <span className="flex flex-col">
      <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{sub}</span>
    </span>
  ) : (
    <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
  );
  if (!info) return <span className="flex-1 flex">{text}</span>;
  return (
    <span className="flex-1 flex items-center gap-0.5 min-w-0">
      {text}
      <InfoTip label={t('common.aboutField', { label })}>{info}</InfoTip>
    </span>
  );
}
