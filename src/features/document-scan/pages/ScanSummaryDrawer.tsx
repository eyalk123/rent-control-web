import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Users } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { FormInput } from '@/shared/components/form/FormInput';
import { formatMoney } from '@/shared/utils/money';
import type { MappedExtraction, MappedRenter } from '../utils/mapExtraction';
import { applyJointRentSplit, equalShares, sharesSumToTotal } from '../utils/splitJointRent';

interface Props {
  open: boolean;
  onClose: () => void;
  mapped: MappedExtraction;
  /** Continue into the verification forms, carrying the finalised renters (joint rent split
   *  applied to each renter's baseRent when the lease had one shared amount). */
  onContinue: (renters: MappedRenter[]) => void;
}

const renterName = (r: MappedRenter, i: number, fallback: string): string => {
  const name = `${r.prefill.firstName ?? ''} ${r.prefill.lastName ?? ''}`.trim();
  return name || `${fallback} ${i + 1}`;
};

/** Post-scan summary: shows what the scan found (one property, N renters) before the user
 *  verifies each form. When the lease had a single joint rent, offers an equal/custom split
 *  that is written into each renter's baseRent on continue. */
export function ScanSummaryDrawer({ open, onClose, mapped, onContinue }: Props) {
  const { t } = useTranslation();
  const renters = mapped.renters;
  const total = mapped.jointMonthlyRent ?? 0;
  const showSplit = mapped.rentIsJoint && renters.length > 1 && total > 0;

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<string[]>(() =>
    equalShares(total, renters.length).map(String),
  );

  const numericCustom = useMemo(() => customShares.map((s) => Number(s)), [customShares]);
  const customValid = useMemo(
    () => numericCustom.every((n) => Number.isFinite(n) && n >= 0) && sharesSumToTotal(numericCustom, total),
    [numericCustom, total],
  );
  const customSum = numericCustom.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  const canContinue = !showSplit || splitMode === 'equal' || customValid;

  const handleContinue = () => {
    if (!canContinue) return;
    if (!mapped.rentIsJoint || total <= 0) {
      onContinue(renters);
      return;
    }
    const shares = showSplit && splitMode === 'custom' ? numericCustom : equalShares(total, renters.length);
    onContinue(applyJointRentSplit(renters, total, shares));
  };

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="h-10 px-4 rounded-[9px] text-[13px] font-medium"
        style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className="flex-1 h-10 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {t('common.continue')}
      </button>
    </div>
  );

  const address = mapped.propertyPrefill.address;
  const city = mapped.propertyPrefill.city;

  return (
    <Drawer open={open} onClose={onClose} title={t('documentScan.summaryTitle')} width={520} footer={footer}>
      <div className="flex flex-col gap-5">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('documentScan.summarySubtitle')}
        </p>

        {/* Property */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Home size={15} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('documentScan.summaryProperty', { count: 1 })}
            </h3>
          </div>
          <div className="rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}>
            {address ? `${address}${city ? `, ${city}` : ''}` : t('documentScan.summaryNoAddress')}
          </div>
        </section>

        {/* Renters */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('documentScan.summaryRenters', { count: renters.length })}
            </h3>
          </div>
          <ul className="flex flex-col gap-2">
            {renters.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}
              >
                <span>{renterName(r, i, t('renter.renter'))}</span>
                {mapped.rentIsJoint && total > 0 && (
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {splitMode === 'custom'
                      ? formatMoney(numericCustom[i])
                      : formatMoney(equalShares(total, renters.length)[i])}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Joint rent split */}
        {showSplit && (
          <section className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)' }}>
            <div>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('documentScan.jointRentTitle')}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('documentScan.jointRentHint', { amount: formatMoney(total) })}
              </p>
            </div>
            <div className="flex gap-2">
              {(['equal', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className="flex-1 h-9 rounded-[9px] text-[13px] font-medium transition-colors"
                  style={{
                    border: `1px solid ${splitMode === mode ? 'var(--color-primary)' : 'var(--color-outline)'}`,
                    color: splitMode === mode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    background: 'var(--color-surface)',
                  }}
                >
                  {t(mode === 'equal' ? 'documentScan.splitEqual' : 'documentScan.splitCustom')}
                </button>
              ))}
            </div>

            {splitMode === 'custom' && (
              <div className="flex flex-col gap-2">
                {renters.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {renterName(r, i, t('renter.renter'))}
                    </span>
                    <div className="w-32">
                      <FormInput
                        type="number"
                        min={0}
                        value={customShares[i] ?? ''}
                        onChange={(e) =>
                          setCustomShares((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                        }
                      />
                    </div>
                  </div>
                ))}
                <p
                  className="text-xs"
                  style={{ color: customValid ? 'var(--color-text-secondary)' : 'var(--color-error)' }}
                >
                  {t('documentScan.splitSum', { sum: formatMoney(customSum), total: formatMoney(total) })}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </Drawer>
  );
}
