interface Props<T extends string> {
  tabs: { id: T; label: string }[];
  activeId: T;
  onChange: (id: T) => void;
}

export function DetailTabBar<T extends string>({ tabs, activeId, onChange }: Props<T>) {
  return (
    <div className="flex gap-0 -mb-px">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="px-[18px] py-3 text-[13px] transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeId === tab.id ? '2px solid var(--color-brand-navy)' : '2px solid transparent',
            color: activeId === tab.id ? 'var(--color-brand-navy)' : 'var(--color-text-secondary)',
            fontWeight: activeId === tab.id ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
