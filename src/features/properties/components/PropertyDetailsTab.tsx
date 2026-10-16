import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registryKey1, registryKey2 } from '@/shared/utils/registryLabels';
import { formatArea } from '@/shared/utils/money';
import { MapPin, Car, Zap, Droplets, Receipt, Users, Calendar, TrendingUp, Plus, History, Percent } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DetailRow } from '@/shared/components/detail/DetailRow';
import { formatDate, formatMoney } from '@/shared/utils/money';
import { useToast } from '@/shared/components/ui/Toast';
import { useCreatePropertyValuation } from '../queries';
import { PropertyValueDialog } from './PropertyValueDialog';
import { PropertyValueHistoryDialog } from './PropertyValueHistoryDialog';
import { formatPercent } from '../utils/propertyReturns';
import { MortgagePanel } from './MortgagePanel';
import { capabilities } from '@/shared/utils/capabilities';
import type { Property } from '@/shared/types';

interface Props {
  property: Property;
}

export function PropertyDetailsTab({ property }: Props) {
  const { t } = useTranslation();
  const parking = property.parking_numbers?.filter(Boolean).join(', ') || null;

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <DetailPanel title={t('property.basicInfo')}>
        <DetailRow icon={MapPin} label={t('property.address')} value={`${property.address}, ${property.city}${property.zip_code ? ` ${property.zip_code}` : ''}`} />
        <DetailRow icon={Receipt} label={t('property.type')} value={t(`property.type_${property.type}` as never, property.type)} />
        <DetailRow icon={Receipt} label={t('property.size')} value={formatArea(property.sq_ft) || null} />
        <DetailRow icon={Receipt} label={t('property.rooms')} value={property.number_of_rooms ? String(property.number_of_rooms) : null} />
        <DetailRow icon={Receipt} label={t('property.floor')} value={property.floor != null ? String(property.floor) : null} />
        <DetailRow icon={Receipt} label={t('property.apartment')} value={property.apartment} />
        {/* Country decides which registry concept applies; the locale file says it. */}
        <DetailRow icon={MapPin} label={t(registryKey1())} value={property.block} />
        {registryKey2() && (
          <DetailRow icon={MapPin} label={t(registryKey2()!)} value={property.plot} />
        )}
        <DetailRow icon={Users} label={t('property.owner')} value={property.property_owner} last />
      </DetailPanel>

      <PurchaseAndValuePanel property={property} />

      {capabilities().mortgage && (
        <div className="flex flex-col gap-4">
          <MortgagePanel property={property} />
        </div>
      )}

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

/**
 * What was paid and what it is worth now. The current value is the latest entry of the value
 * history; "+" adds one straight away (the same dialog as the form's), and History lists them.
 */
function PurchaseAndValuePanel({ property }: Props) {
  const { t } = useTranslation();
  // Computed by the server — the same figures the assistant quotes.
  const returns = property.returns;
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const createMutation = useCreatePropertyValuation(property.id);

  const iconBtn = 'h-8 shrink-0 flex items-center justify-center gap-1 rounded-lg text-[12px] font-medium hover:bg-[var(--color-input-bg)]';

  return (
    <DetailPanel title={t('property.valueSection')}>
      <DetailRow
        icon={Receipt}
        label={t('property.purchasePrice')}
        value={property.purchase_price != null ? formatMoney(property.purchase_price) : null}
      />
      <DetailRow
        icon={Calendar}
        label={t('property.purchaseDate')}
        value={property.purchase_date ? formatDate(property.purchase_date) : null}
      />
      <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
        <TrendingUp size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
        <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.currentValue')}</span>
        {property.current_value != null ? (
          <span className="flex flex-col items-end">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(property.current_value)}
            </span>
            {property.current_value_date && (
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('property.valueAsOf', { date: formatDate(property.current_value_date) })}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.noCurrentValue')}</span>
        )}
        {property.current_value != null && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className={`${iconBtn} px-2`}
            style={{ color: 'var(--color-primary)' }}
          >
            <History size={14} aria-hidden="true" />
            {t('property.showValueHistory')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label={t('property.addValue')}
          title={t('property.addValue')}
          className={`${iconBtn} w-8 text-white hover:opacity-90`}
          style={{ background: 'var(--color-primary)' }}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      {/* Neutral ink throughout: a yield or a change in value is a fact to read, not an alarm. */}
      <DetailRow
        icon={Percent}
        label={t('property.grossYield')}
        value={returns?.gross_yield != null ? formatPercent(returns.gross_yield) : null}
      />
      <DetailRow
        icon={Percent}
        label={t('property.netYield')}
        value={returns?.net_yield != null ? formatPercent(returns.net_yield) : null}
      />
      {returns?.appreciation != null && returns.appreciation_pct != null && (
        <div className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <TrendingUp size={15} style={{ color: 'var(--color-brand-navy)' }} strokeWidth={1.6} />
          <span className="flex-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('property.appreciation')}</span>
          <span className="flex flex-col items-end">
            {/* dir="ltr", or a Hebrew line moves the sign and brackets to the far end. */}
            <span dir="ltr" className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {returns.appreciation > 0 ? '+' : ''}{formatMoney(returns.appreciation)} ({formatPercent(returns.appreciation_pct, true)})
            </span>
            {returns.appreciation_per_year != null && (
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {t('property.appreciationPerYear', { pct: formatPercent(returns.appreciation_per_year, true) })}
              </span>
            )}
          </span>
        </div>
      )}
      <PropertyValueDialog
        open={addOpen}
        loading={createMutation.isPending}
        onConfirm={async (valuation) => {
          try {
            await createMutation.mutateAsync(valuation);
            setAddOpen(false);
          } catch {
            showToast(t('property.valueSaveFailed'), 'error');
          }
        }}
        onClose={() => setAddOpen(false)}
      />
      <PropertyValueHistoryDialog
        open={historyOpen}
        propertyId={property.id}
        purchasePrice={property.purchase_price}
        purchaseDate={property.purchase_date}
        onClose={() => setHistoryOpen(false)}
      />
    </DetailPanel>
  );
}
