import { useEffect, useMemo, useState } from 'react';
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
  /** The scanned property matches an existing one (surfaced as an "already exists" badge). */
  propertyMatched: boolean;
  /** Indices of scanned renters that already exist on the matched property. Only these get an
   *  "already exists" badge + an include checkbox; the user can exclude them from creation. */
  duplicateRenterIdx: Set<number>;
  /** Continue into the verification forms, carrying the finalised renters (duplicates the user
   *  excluded are dropped; joint rent split applied over the ones that remain). */
  onContinue: (renters: MappedRenter[]) => void;
}

const renterName = (r: MappedRenter, i: number, fallback: string): string => {
  const name = `${r.prefill.firstName ?? ''} ${r.prefill.lastName ?? ''}`.trim();
  return name || `${fallback} ${i + 1}`;
};

/** Post-scan summary: shows what the scan found (one property, N renters) before the user
 *  verifies each form. Flags a property/renter that already exists so re-scanning a known lease
 *  is obvious, and lets the user exclude duplicate renters. When the lease had a single joint
 *  rent, offers an equal/custom split that is written into each kept renter's baseRent. */
export function ScanSummaryDrawer({ open, onClose, mapped, propertyMatched, duplicateRenterIdx, onContinue }: Props) {
  const { t } = useTranslation();
  const renters = mapped.renters;
  const total = mapped.jointMonthlyRent ?? 0;

  // Duplicate renters the user has unchecked (excluded from creation). Keyed by original index.
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set());
  const includedIdx = useMemo(() => renters.map((_, i) => i).filter((i) => !excluded.has(i)), [renters, excluded]);
  const includedRenters = useMemo(() => includedIdx.map((i) => renters[i]), [includedIdx, renters]);
  // Original index -> position among the included renters (for share lookups).
  const posByIdx = useMemo(() => new Map(includedIdx.map((idx, pos) => [idx, pos])), [includedIdx]);

  const showSplit = mapped.rentIsJoint && includedRenters.length > 1 && total > 0;

  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<string[]>(() =>
    equalShares(total, includedRenters.length).map(String),
  );
  // Excluding/including a renter changes the split; reset custom shares to an even split.
  useEffect(() => {
    setCustomShares(equalShares(total, includedRenters.length).map(String));
  }, [includedRenters.length, total]);

  const numericCustom = useMemo(() => customShares.map((s) => Number(s)), [customShares]);
  const customValid = useMemo(
    () => numericCustom.every((n) => Number.isFinite(n) && n >= 0) && sharesSumToTotal(numericCustom, total),
    [numericCustom, total],
  );
  const customSum = numericCustom.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  const splitValid = !showSplit || splitMode === 'equal' || customValid;
  // Nothing left to create if every renter was excluded.
  const canContinue = includedRenters.length > 0 && splitValid;

  const toggleExcluded = (i: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const handleContinue = () => {
    if (!canContinue) return;
    if (!mapped.rentIsJoint || total <= 0) {
      onContinue(includedRenters);
      return;
    }
    const shares = showSplit && splitMode === 'custom' ? numericCustom : equalShares(total, includedRenters.length);
    onContinue(applyJointRentSplit(includedRenters, total, shares));
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
          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--color-outline)', color: 'var(--color-text-primary)' }}>
            <span>{address ? `${address}${city ? `, ${city}` : ''}` : t('documentScan.summaryNoAddress')}</span>
            {propertyMatched && <DuplicateBadge label={t('documentScan.duplicateProperty')} />}
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
            {renters.map((r, i) => {
              const isDuplicate = duplicateRenterIdx.has(i);
              const isExcluded = excluded.has(i);
              const pos = posByIdx.get(i);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{
                    border: '1px solid var(--color-outline)',
                    color: 'var(--color-text-primary)',
                    opacity: isExcluded ? 0.55 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isDuplicate && (
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleExcluded(i)}
                        aria-label={t('documentScan.includeRenter', { name: renterName(r, i, t('renter.renter')) })}
                        className="shrink-0"
                      />
                    )}
                    <span className="truncate">{renterName(r, i, t('renter.renter'))}</span>
                    {isDuplicate && <DuplicateBadge label={t('documentScan.duplicateRenter')} />}
                  </div>
                  {mapped.rentIsJoint && total > 0 && !isExcluded && pos !== undefined && (
                    <span className="text-xs shrink-0" style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {splitMode === 'custom'
                        ? formatMoney(numericCustom[pos])
                        : formatMoney(equalShares(total, includedRenters.length)[pos])}
                    </span>
                  )}
                </li>
              );
            })}
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
                {includedRenters.map((r, pos) => (
                  <div key={includedIdx[pos]} className="flex items-center gap-2">
                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {renterName(r, includedIdx[pos], t('renter.renter'))}
                    </span>
                    <div className="w-32">
                      <FormInput
                        type="number"
                        min={0}
                        value={customShares[pos] ?? ''}
                        onChange={(e) =>
                          setCustomShares((prev) => prev.map((v, idx) => (idx === pos ? e.target.value : v)))
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

/** Small "already exists" pill shown next to a matched property / renter. */
function DuplicateBadge({ label }: { label: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ background: 'var(--color-warning-surface, rgba(217,119,6,0.12))', color: 'var(--color-warning, #b45309)' }}
    >
      {label}
    </span>
  );
}
