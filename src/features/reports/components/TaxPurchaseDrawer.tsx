import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Drawer } from '@/shared/components/ui/Drawer';
import { InfoTip } from '@/shared/components/ui/InfoTip';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormDateInput } from '@/shared/components/form/FormDateInput';
import { useToast } from '@/shared/components/ui/Toast';
import { currencySymbol } from '@/shared/utils/money';
import { todayISO } from '@/shared/utils/dates';
import { useProperty, useUpdateProperty } from '@/features/properties/queries';
import { taxKeys } from '../taxQueries';
import type { TaxPropertyBrief } from '../api/taxTracks';

interface Props {
  /** The flat whose purchase details the depreciation needs; null when closed. */
  property: TaxPropertyBrief | null;
  onClose: () => void;
}

/**
 * Fills in a flat's purchase price and date from the tax report, without leaving it. Saved on
 * the property itself — the same two fields as the property form.
 */
export function TaxPurchaseDrawer({ property, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const id = property?.id ?? 0;
  const { data: existing } = useProperty(id, { enabled: id > 0 });
  const update = useUpdateProperty(id);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!property) return;
    setPrice(existing?.purchase_price != null ? String(existing.purchase_price) : '');
    setDate(existing?.purchase_date ?? '');
    setError('');
  }, [property, existing?.purchase_price, existing?.purchase_date]);

  const submit = async () => {
    const value = Number(price);
    if (!price.trim() || !Number.isFinite(value) || value <= 0 || !date) {
      setError(t('taxTracks.purchaseRequired'));
      return;
    }
    try {
      await update.mutateAsync({ purchase_price: value, purchase_date: date });
      await qc.invalidateQueries({ queryKey: taxKeys.all });
      showToast(t('taxTracks.purchaseSaved'), 'success');
      onClose();
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium ms-auto"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={update.isPending}
        className="h-10 px-5 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary-fill)' }}
      >
        {update.isPending ? '...' : t('common.save')}
      </button>
    </div>
  );

  return (
    <Drawer open={property != null} onClose={onClose} title={t('taxTracks.purchaseTitle')} width={460} footer={footer}>
      <div className="space-y-5">
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('taxTracks.purchaseHint', { address: property?.address ?? '' })}
        </p>
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <label htmlFor="tax-purchase-price" className="text-sm font-medium text-[var(--color-text-primary)]">
              {`${t('property.purchasePrice')} (${currencySymbol()})`}
            </label>
            <InfoTip label={t('taxTracks.aboutField', { field: t('property.purchasePrice') })}>
              <p>{t('taxTracks.purchasePriceInfo')}</p>
            </InfoTip>
          </div>
          <FormInput
            id="tax-purchase-price"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <FormDateInput label={t('property.purchaseDate')} max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
      </div>
    </Drawer>
  );
}
