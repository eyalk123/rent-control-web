import { useTranslation } from 'react-i18next';
import { Shield, CreditCard, Calendar, Hash } from 'lucide-react';
import { DetailPanel } from '@/shared/components/detail/DetailPanel';
import { DetailRow } from '@/shared/components/detail/DetailRow';
import { DocRow } from '@/shared/components/detail/DocRow';
import { LeaseTimeline } from './LeaseTimeline';
import { formatMoney } from '@/shared/utils/money';
import type { Renter } from '@/shared/types';

interface Props {
  renter: Renter;
}

export function LeaseInfoTab({ renter }: Props) {
  const { t } = useTranslation();
  const extras = renter.extra_contacts ?? [];
  const docs: { label: string; url: string }[] = [];
  if (renter.full_contract_url) docs.push({ label: t('documents.fullContract'), url: renter.full_contract_url });
  if (renter.id_image_url) docs.push({ label: t('documents.idImage'), url: renter.id_image_url });
  const insuranceTypeLabels: Record<string, string> = {
    wire_transfer: t('renter.insuranceTypeWireTransfer'),
    bank_guarantee: t('renter.insuranceTypeBankGuarantee'),
  };
  return (
    <div className="flex flex-col gap-4">
      {/* Full-width lease timeline */}
      <LeaseTimeline renter={renter} />

      {/* Balanced card grid, ordered by relevance */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'start' }}>
        <DetailPanel title={t('renter.paymentPanel')}>
          <DetailRow icon={CreditCard} label={t('renter.paymentMethod')} value={renter.payment_type} />
          <DetailRow icon={Calendar} label={t('renter.payDay')} value={renter.payment_day_of_month ? t('renter.payDayValue', { day: renter.payment_day_of_month }) : null} />
          <DetailRow icon={Hash} label={t('renter.numberOfPayments')} value={renter.number_of_payments != null ? String(renter.number_of_payments) : null} last />
        </DetailPanel>

        <DetailPanel title={t('renter.insurancePanel')}>
          {renter.insurance_type ? (
            <div>
              <DetailRow icon={Shield} label={t('renter.insuranceTypeLabel')} value={insuranceTypeLabels[renter.insurance_type] ?? renter.insurance_type} />
              <DetailRow icon={CreditCard} label={t('renter.insuranceAmountLabel')} value={renter.insurance_amount ? formatMoney(renter.insurance_amount) : null} last />
            </div>
          ) : (
            <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('renter.noInsurance')}</p>
          )}
        </DetailPanel>

        <DetailPanel title={t('documents.title')}>
          {docs.length === 0 ? (
            <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('documents.none')}</p>
          ) : (
            <div className="p-2">
              {docs.map((d, i) => <DocRow key={d.label} label={d.label} url={d.url} last={i === docs.length - 1} />)}
            </div>
          )}
        </DetailPanel>

        <DetailPanel title={t('renter.extraContactsPanel', { count: extras.length })}>
          {extras.length === 0 ? (
            <p className="p-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>{t('renter.noExtraContacts')}</p>
          ) : extras.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-[18px] py-3" style={{ borderBottom: i === extras.length - 1 ? 'none' : '1px solid var(--color-outline)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'var(--color-input-filled-background)', color: 'var(--color-text-secondary)' }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                <p className="text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>{c.phone}</p>
              </div>
            </div>
          ))}
        </DetailPanel>
      </div>
    </div>
  );
}
