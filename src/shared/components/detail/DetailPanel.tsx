interface Props {
  title: string;
  children: React.ReactNode;
}

export function DetailPanel({ title, children }: Props) {
  return (
    <section className="rounded-[var(--radius-card)] overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}>
      <header className="px-[18px] py-3.5 text-[14px] font-bold" style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-outline)' }}>
        {title}
      </header>
      <div>{children}</div>
    </section>
  );
}
