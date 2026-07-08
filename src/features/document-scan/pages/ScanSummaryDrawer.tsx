import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Home, Info, Users } from 'lucide-react';
import { Drawer } from '@/shared/components/ui/Drawer';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormSelect } from '@/shared/components/form/FormSelect';
import { formatMoney } from '@/shared/utils/money';
import { formatFloorApartment } from '@/shared/utils/propertyAddress';
import type { Property, Renter } from '@/shared/types';
import type { MappedExtraction, MappedRenter } from '../utils/mapExtraction';
import type { ScanContinuePayload } from '../ScanContext';
import { applyJointRentSplit, equalShares, sharesSumToTotal } from '../utils/splitJointRent';
import { findDuplicateRenterMatches, matchProperty } from '../utils/matchProperty';

const NEW_PROPERTY = '__new__';

interface Props {
  open: boolean;
  onClose: () => void;
  mapped: MappedExtraction;
  /** All of the owner's properties — for the "attach to" picker, address auto-match and diff. */
  properties: Property[];
  /** Existing renters — to flag scanned renters that already exist on the chosen property. */
  existingRenters: Renter[];
  /** Continue into the verification forms, carrying the finalised renters, the chosen property
   *  to attach to (or null to create one) and any address edits. */
  onContinue: (payload: ScanContinuePayload) => void;
}

const renterName = (r: MappedRenter, i: number, fallback: string): string => {
  const name = `${r.prefill.firstName ?? ''} ${r.prefill.lastName ?? ''}`.trim();
  return name || `${fallback} ${i + 1}`;
};

/** Post-scan summary: shows what the scan found (one property, N renters) before the user
 *  verifies each form. Lets the user edit the found address, attach the lease to an existing
 *  property or create a new one, and exclude duplicate renters. Field-level review (fills +
 *  conflicts) happens in the property/renter forms that open next, not here. When the lease had
 *  a single joint rent, offers an equal/custom split that is written into each kept renter's
 *  baseRent. */
export function ScanSummaryDrawer({ open, onClose, mapped, properties, existingRenters, onContinue }: Props) {
  const { t } = useTranslation();
  const renters = mapped.renters;
  const total = mapped.jointMonthlyRent ?? 0;

  // Editable address/city (seeded from the scan; re-seeded when a new scan replaces `mapped`).
  const [editedAddress, setEditedAddress] = useState(mapped.propertyPrefill.address ?? '');
  const [editedCity, setEditedCity] = useState(mapped.propertyPrefill.city ?? '');
  // Which existing property (if any) to attach the lease to; null = create a new property.
  const [targetPropertyId, setTargetPropertyId] = useState<number | null>(null);
  const [userPicked, setUserPicked] = useState(false);
  // Whether the full property picker (dropdown + editable address) is revealed. Collapsed by
  // default so the common case shows a single clear summary of what the lease attaches to.
  const [showPicker, setShowPicker] = useState(false);
  useEffect(() => {
    setEditedAddress(mapped.propertyPrefill.address ?? '');
    setEditedCity(mapped.propertyPrefill.city ?? '');
    setUserPicked(false);
    setShowPicker(false);
  }, [mapped]);

  // Auto-match the address to an existing property until the user explicitly picks.
  const autoMatchId = useMemo(
    () =>
      matchProperty(
        {
          address: editedAddress,
          city: editedCity,
          floor: mapped.propertyPrefill.floor,
          apartment: mapped.propertyPrefill.apartment,
        },
        properties,
      ).propertyId,
    [editedAddress, editedCity, mapped.propertyPrefill.floor, mapped.propertyPrefill.apartment, properties],
  );
  useEffect(() => {
    if (!userPicked) setTargetPropertyId(autoMatchId);
  }, [autoMatchId, userPicked]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === targetPropertyId) ?? null,
    [properties, targetPropertyId],
  );

  const propertyOptions = useMemo(
    () => [
      { label: t('documentScan.createNewProperty'), value: NEW_PROPERTY },
      ...properties.map((p) => ({
        label: `${p.address}${formatFloorApartment(p, t)} - ${p.city}`,
        value: String(p.id),
      })),
    ],
    [properties, t],
  );

  // Duplicate renters on the chosen property (index -> matched existing renter id). They get a
  // badge + include/exclude checkbox, and when kept the form edits that existing renter in place.
  const duplicateRenterIdx = useMemo(
    () => findDuplicateRenterMatches(renters, targetPropertyId, existingRenters),
    [renters, targetPropertyId, existingRenters],
  );

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

    // The property itself is reviewed/updated in the property form (which now always opens),
    // so the summary only finalises the renter list and the chosen attach target here.
    // Tag each kept renter with the existing renter it duplicates (if any) so the form edits that
    // renter in place instead of creating a copy.
    const taggedRenters = includedIdx.map((origIdx, pos) => ({
      ...includedRenters[pos],
      existingRenterId: duplicateRenterIdx.get(origIdx) ?? null,
    }));

    const finalRenters =
      !mapped.rentIsJoint || total <= 0
        ? taggedRenters
        : applyJointRentSplit(
            taggedRenters,
            total,
            showSplit && splitMode === 'custom' ? numericCustom : equalShares(total, taggedRenters.length),
          );

    onContinue({
      renters: finalRenters,
      targetPropertyId,
      propertyPrefill: { ...mapped.propertyPrefill, address: editedAddress, city: editedCity },
    });
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

  return (
    <Drawer open={open} onClose={onClose} title={t('documentScan.summaryTitle')} width={520} footer={footer}>
      <div className="flex flex-col gap-5">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('documentScan.summarySubtitle')}
        </p>

        {/* Property */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Home size={15} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {t('documentScan.summaryProperty', { count: 1 })}
            </h3>
          </div>
          {showPicker ? (
            // Expanded picker: choose any property, or "create new" (then edit its address/city).
            <>
              <FormSelect
                label={t('documentScan.attachToProperty')}
                value={targetPropertyId != null ? String(targetPropertyId) : NEW_PROPERTY}
                onValueChange={(v) => {
                  setUserPicked(true);
                  setTargetPropertyId(v === NEW_PROPERTY ? null : Number(v));
                }}
                options={propertyOptions}
              />
              {targetPropertyId == null && (
                <>
                  <FormInput label={t('property.address')} value={editedAddress} onChange={(e) => setEditedAddress(e.target.value)} />
                  <FormInput label={t('property.city')} value={editedCity} onChange={(e) => setEditedCity(e.target.value)} />
                </>
              )}
            </>
          ) : selectedProperty ? (
            // Collapsed, matched: one clear card naming the property the lease attaches to.
            <div className="flex flex-col gap-1.5 rounded-xl p-3" style={{ background: 'var(--color-input-filled-background)', border: '1px solid var(--color-outline)' }}>
              <div className="flex items-center gap-1.5">
                <Check size={14} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('documentScan.attachingToExisting')}
                </span>
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {`${selectedProperty.address}${formatFloorApartment(selectedProperty, t)} - ${selectedProperty.city}`}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('documentScan.matchedFromLease')}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={() => setShowPicker(true)} className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                  {t('documentScan.changeProperty')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserPicked(true);
                    setTargetPropertyId(null);
                    setShowPicker(true);
                  }}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('documentScan.createNewInstead')}
                </button>
              </div>
            </div>
          ) : (
            // Collapsed, no match: editable new-property fields with a link to attach instead.
            <>
              <FormInput label={t('property.address')} value={editedAddress} onChange={(e) => setEditedAddress(e.target.value)} />
              <FormInput label={t('property.city')} value={editedCity} onChange={(e) => setEditedCity(e.target.value)} />
              <div className="flex items-center justify-between gap-2 -mt-1">
                <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <Info size={13} className="shrink-0" aria-hidden="true" />
                  <span>{t('documentScan.willCreateNew')}</span>
                </p>
                <button type="button" onClick={() => setShowPicker(true)} className="text-xs font-medium hover:underline whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                  {t('documentScan.attachExistingInstead')}
                </button>
              </div>
            </>
          )}

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

/** Small "already exists" pill shown next to a matched renter. */
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
