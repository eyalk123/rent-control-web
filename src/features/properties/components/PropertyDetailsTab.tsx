import { useTranslation } from 'react-i18next';
import { MapPin, Car, Zap, Droplets, Receipt, Users } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DetailRow } from '@/shared/components/detail/DetailRow';
import { formatMoney } from '@/shared/utils/money';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
}

export function PropertyDetailsTab({ property }: Props) {
  const { t } = useTranslation();
  const parking = property.parking_numbers?.filter(Boolean).join(', ') || null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <DetailPanel title={t('property.basicInfo')}>
        <DetailRow icon={MapPin} label={t('property.address')} value={`${property.address}, ${property.city}${property.zip_code ? ` ${property.zip_code}` : ''}`} />
        <DetailRow icon={Receipt} label={t('property.type')} value={t(`property.type_${property.type}` as never, property.type)} />
        <DetailRow icon={Users} label={t('property.owner')} value={property.property_owner} />
        <DetailRow icon={Receipt} label={t('property.size')} value={property.sq_ft ? `${property.sq_ft}m²` : null} />
        <DetailRow icon={Receipt} label={t('property.rooms')} value={property.number_of_rooms ? String(property.number_of_rooms) : null} />
        <DetailRow icon={Receipt} label={t('property.floor')} value={property.floor != null ? String(property.floor) : null} last />
      </DetailPanel>

      <DetailPanel title={t('property.utilitiesNumbers')}>
        <DetailRow icon={Car} label={t('property.parking')} value={parking} />
        <DetailRow icon={Zap} label={t('property.electricMeter')} value={property.electricity_meter_number} />
        <DetailRow icon={Receipt} label={t('property.electricAccount')} value={property.electricity_account_number} />
        <DetailRow icon={Droplets} label={t('property.waterMeter')} value={property.water_meter_number} />
        <DetailRow icon={Receipt} label={t('property.waterAccount')} value={property.water_account_number} last />
      </DetailPanel>

      <DetailPanel title={t('property.fees')}>
        <DetailRow icon={Receipt} label={t('property.annualPropertyTax')} value={property.property_tax ? formatMoney(property.property_tax) : null} />
        <DetailRow icon={Receipt} label={t('property.houseCommittee')} value={property.house_committee ? `${formatMoney(property.house_committee)}${t('common.perMonth')}` : null} last />
      </DetailPanel>

      <DetailPanel title={t('property.inventoryNotesSection')}>
        <div className="p-4 text-[13px] leading-relaxed" style={{ color: property.inventory_notes ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          {property.inventory_notes || t('property.noInventoryNotes')}
        </div>
      </DetailPanel>
    </div>
  );
}
