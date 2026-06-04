import { useTranslation } from 'react-i18next';
import { FileText, Download } from 'lucide-react';

interface Props {
  label: string;
  url: string;
  last?: boolean;
}

export function DocRow({ label, url, last = false }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3" style={{ borderBottom: last ? 'none' : '1px solid var(--color-outline)' }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--color-exp-bg)', color: 'var(--color-exp-fg)' }}>
        <FileText size={16} />
      </div>
      <p className="flex-1 text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1 h-7 px-2.5 rounded-[7px] text-[12px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        <Download size={12} /> {t('common.download')}
      </a>
    </div>
  );
}
