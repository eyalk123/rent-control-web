interface Props {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
  last?: boolean;
}

export function DetailRow({ icon: Icon, label, value, href, last = false }: Props) {
  if (!value) return null;
  const valueEl = href ? (
    <a href={href} className="text-[13px] font-semibold hover:underline" style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</a>
  ) : (
    <span className="text-[13px] font-semibold text-end" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  );
  return (
    <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <Icon size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
      <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      {valueEl}
    </div>
  );
}
