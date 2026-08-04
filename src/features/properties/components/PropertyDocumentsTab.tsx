import { useTranslation } from 'react-i18next';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DocRow } from '@/shared/components/detail/DocRow';
import { PropertyDocumentSlot } from './PropertyDocumentSlot';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
}

export function PropertyDocumentsTab({ property }: Props) {
  const { t } = useTranslation();
  const docs: { label: string; url: string }[] = [];
  if (property.basic_contract_url) docs.push({ label: t('documents.basicContract'), url: property.basic_contract_url });
  if (property.land_registry_url) docs.push({ label: t('documents.landRegistry'), url: property.land_registry_url });

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
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
        {/* A property has exactly two document slots, so each one is its own labelled target. */}
        <div className="p-4 flex flex-col gap-4">
          <PropertyDocumentSlot property={property} slot="basic_contract_url" label={t('documents.basicContract')} />
          <PropertyDocumentSlot property={property} slot="land_registry_url" label={t('documents.landRegistry')} />
          <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.fileFormats')}</p>
        </div>
      </DetailPanel>
    </div>
  );
}
