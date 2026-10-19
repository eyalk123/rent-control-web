import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/shared/components/form/FormInput';
import { InfoTip } from '@/shared/components/ui/InfoTip';
import { useToast } from '@/shared/components/ui/Toast';
import { currencySymbol, formatMoney } from '@/shared/utils/money';
import { useSaveTaxInputs } from '../taxQueries';
import type { TaxInputs } from '../api/taxTracks';

function FieldLabel({ htmlFor, text, children }: { htmlFor: string; text: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--color-text-primary)]">{text}</label>
      <InfoTip label={t('taxTracks.aboutField', { field: text })}>{children}</InfoTip>
    </div>
  );
}

interface Props {
  groupKey: string;
  year: number;
  inputs: TaxInputs;
  basicPoints: number | null;
}

/**
 * The household's other income for the year, and its credit points when that income is too
 * low to use them up. Saved per group and year on the server, for the marginal rate and the
 * surtax. Credit points are not asked above the threshold: the other income has used them.
 */
export function TaxYearInputs({ groupKey, year, inputs, basicPoints }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const save = useSaveTaxInputs();
  const [other, setOther] = useState('');
  const [points, setPoints] = useState('');

  useEffect(() => {
    setOther(inputs.other_income != null ? String(inputs.other_income) : '');
    setPoints(inputs.credit_points != null ? String(inputs.credit_points) : '');
  }, [inputs.other_income, inputs.credit_points, groupKey, year]);

  const otherValue = other.trim() === '' ? null : Number(other);
  const pointsValue = points.trim() === '' ? null : Number(points);
  const invalid =
    (otherValue != null && (!Number.isFinite(otherValue) || otherValue < 0)) ||
    (pointsValue != null && (!Number.isFinite(pointsValue) || pointsValue < 0 || pointsValue > 30));
  const threshold = inputs.credit_points_threshold;
  // Asked as soon as the typed income is under the threshold, before it is saved.
  const askPoints = threshold != null && otherValue != null && otherValue < threshold;
  const changed = otherValue !== inputs.other_income || (askPoints && pointsValue !== inputs.credit_points);

  const submit = async () => {
    if (invalid) return;
    try {
      await save.mutateAsync({
        group_key: groupKey,
        year,
        other_income: otherValue,
        credit_points: askPoints ? pointsValue : inputs.credit_points,
      });
      showToast(t('taxTracks.inputsSaved'), 'success');
    } catch {
      showToast(t('error.saveFailed'), 'error');
    }
  };

  return (
    <div className="mt-3 rounded-xl p-3.5" style={{ background: 'var(--color-input-filled-background)' }}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <FieldLabel htmlFor={`other-${groupKey}`} text={`${t('taxTracks.otherIncome', { year })} (${currencySymbol()})`}>
            <p>{t('taxTracks.otherIncomeInfo')}</p>
          </FieldLabel>
          <FormInput
            id={`other-${groupKey}`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={other}
            onChange={(e) => setOther(e.target.value)}
          />
        </div>
        {askPoints && (
          <div className="sm:w-40">
            <FieldLabel htmlFor={`points-${groupKey}`} text={t('taxTracks.creditPoints')}>
              <p>{t('taxTracks.creditPointsInfo', {
                basic: basicPoints ?? '',
                threshold: threshold != null ? formatMoney(threshold) : '',
              })}</p>
            </FieldLabel>
            <FormInput
              id={`points-${groupKey}`}
              type="number"
              min={0}
              max={30}
              step={0.25}
              inputMode="decimal"
              placeholder={basicPoints != null ? String(basicPoints) : undefined}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending || invalid || !changed}
          className="h-10 px-4 rounded-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 shrink-0"
          style={{ background: 'var(--color-primary-fill)' }}
        >
          {save.isPending ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  );
}
