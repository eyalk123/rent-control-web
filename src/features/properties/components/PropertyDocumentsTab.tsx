import { useTranslation } from 'react-i18next';
import { FileText, Upload, Paperclip, Download } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import type { Property } from '@/shared/types';

interface DocRowProps {
  label: string;
  url: string;
  last?: boolean;
}

function DocRow({ label, url, last = false }: DocRowProps) {
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

interface Props {
  property: Property;
}

export function PropertyDocumentsTab({ property }: Props) {
  const { t } = useTranslation();
  const docs: { label: string; url: string }[] = [];
  if (property.basic_contract_url) docs.push({ label: 'Basic contract.pdf', url: property.basic_contract_url });
  if (property.land_registry_url) docs.push({ label: 'Land registry.pdf', url: property.land_registry_url });

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      <DetailPanel title={t('property.tabDocuments')}>
        {docs.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.noDocuments')}</p>
        ) : (
          <div className="p-2">
            {docs.map((d, i) => <DocRow key={d.label} label={d.label} url={d.url} last={i === docs.length - 1} />)}
          </div>
        )}
      </DetailPanel>

      <DetailPanel title={t('property.uploadNew')}>
        <div className="p-4">
          <div className="rounded-[12px] p-6 text-center" style={{ border: '1.5px dashed var(--color-outline)' }}>
            <Upload size={22} className="mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('property.dropFiles')}</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{t('property.fileFormats')}</p>
            <label className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[12px] font-medium cursor-pointer"
              style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}>
              <Paperclip size={13} /> {t('property.chooseFile')}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
            </label>
          </div>
        </div>
      </DetailPanel>
    </div>
  );
}
