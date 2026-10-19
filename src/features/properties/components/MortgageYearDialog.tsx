import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/shared/components/form/FormInput';
import { FormDocumentInput } from '@/shared/components/form/FormDocumentInput';
import { useToast } from '@/shared/components/ui/Toast';
import { useAppAuth } from '@/core/auth/AuthContext';
import { currencySymbol } from '@/shared/utils/money';
import { uploadToFirebase, UploadValidationError } from '@/shared/utils/firebaseUpload';
import { useSaveMortgageYear } from '../queries';
import { DialogButtons, DialogShell } from './MortgageDialogs';
import type { MortgageYear } from '@/shared/types';

/** Years a statement can exist for: finished ones, most recent first. */
export function statementYears(): number[] {
  const last = new Date().getFullYear() - 1;
  return Array.from({ length: 15 }, (_, i) => last - i).filter((y) => y >= 2000);
}

interface Props {
  open: boolean;
  propertyId: number;
  mortgageId: number;
  /** The year being edited; absent to add one. */
  entry?: MortgageYear | null;
  /** The year to start on when adding (the tax report asks for a specific one). */
  presetYear?: number;
  /** Years already entered, left out of the picker when adding. */
  takenYears?: number[];
  onClose: () => void;
}

const amount = (raw: string) => (raw.trim() === '' ? null : Number(raw));
const valid = (n: number | null) => n != null && Number.isFinite(n) && n >= 0;

/**
 * One finished year from the bank's yearly mortgage statement: the interest, the linkage
 * differences and the balance on December 31, typed from the statement, with the statement
 * itself kept on the property for the accountant. Used from the property's mortgage section
 * and from the tax report, where the interest is deducted.
 */
export function MortgageYearDialog({ open, propertyId, mortgageId, entry, presetYear, takenYears = [], onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAppAuth();
  const save = useSaveMortgageYear(propertyId);
  const [year, setYear] = useState<number>(0);
  const [interest, setInterest] = useState('');
  const [linkage, setLinkage] = useState('');
  const [balance, setBalance] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = entry ? [entry.year] : statementYears().filter((y) => !takenYears.includes(y));

  useEffect(() => {
    if (!open) return;
    setYear(entry?.year ?? (presetYear && options.includes(presetYear) ? presetYear : options[0] ?? 0));
    setInterest(entry ? String(entry.interest) : '');
    setLinkage(entry ? String(entry.linkage) : '');
    setBalance(entry?.balance != null ? String(entry.balance) : '');
    setFile(null);
    setRemoveDocument(false);
    setTouched(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when (re)opened
  }, [open, entry, presetYear]);

  if (!open) return null;

  const interestValue = amount(interest);
  const linkageValue = amount(linkage);
  const balanceValue = amount(balance);
  const balanceInvalid = balanceValue != null && !valid(balanceValue);

  const submit = async () => {
    setTouched(true);
    if (!year || !valid(interestValue) || !valid(linkageValue) || balanceInvalid) return;
    setBusy(true);
    setError(null);
    try {
      let documentUrl: string | null | undefined;
      if (file) documentUrl = await uploadToFirebase(file, 'properties', user!.uid);
      else if (removeDocument) documentUrl = null;
      await save.mutateAsync({
        mortgageId,
        year,
        data: {
          interest: interestValue!,
          linkage: linkageValue!,
          balance: balanceValue,
          ...(documentUrl !== undefined ? { document_url: documentUrl } : {}),
          ...(file ? { document_label: t('mortgage.yearly.documentLabel', { year }) } : {}),
        },
      });
      showToast(t('mortgage.yearly.saved', { year }), 'success');
      onClose();
    } catch (e) {
      if (e instanceof UploadValidationError) setError(e.message);
      else showToast(t('mortgage.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || save.isPending;
  const money = (label: string) => `${label} (${currencySymbol()})`;

  return (
    <DialogShell
      title={entry ? t('mortgage.yearly.editTitle', { year: entry.year }) : t('mortgage.yearly.addTitle')}
      note={t('mortgage.yearly.note')}
      loading={loading}
      onClose={onClose}
    >
      <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}>
        {!entry && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mortgage-year" className="text-sm font-medium text-[var(--color-text-primary)]">{t('mortgage.yearly.year')}</label>
            <select
              id="mortgage-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            >
              {options.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <FormInput
          label={money(t('mortgage.yearly.interest'))}
          type="number" inputMode="decimal" min={0} step="any" autoFocus
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          error={touched && !valid(interestValue) ? t('mortgage.yearly.required') : undefined}
          name="mortgage_year_interest"
        />
        <FormInput
          label={money(t('mortgage.yearly.linkage'))}
          hint={t('mortgage.yearly.linkageHint')}
          type="number" inputMode="decimal" min={0} step="any"
          value={linkage}
          onChange={(e) => setLinkage(e.target.value)}
          error={touched && !valid(linkageValue) ? t('mortgage.yearly.required') : undefined}
          name="mortgage_year_linkage"
        />
        <FormInput
          label={money(t('mortgage.yearly.balance'))}
          hint={t('mortgage.yearly.optional')}
          type="number" inputMode="decimal" min={0} step="any"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          error={touched && balanceInvalid ? t('mortgage.amountInvalid') : undefined}
          name="mortgage_year_balance"
        />
        <FormDocumentInput
          label={t('mortgage.yearly.document')}
          accept=".pdf,.jpg,.jpeg,.png"
          existingUrl={removeDocument ? null : entry?.document?.url ?? null}
          pendingFile={file}
          onChange={(f) => { setFile(f); if (f) setRemoveDocument(false); }}
          onRemoveExisting={() => setRemoveDocument(true)}
          error={error ?? undefined}
        />
        <DialogButtons submitLabel={t('common.save')} loading={loading} onClose={onClose} />
      </form>
    </DialogShell>
  );
}
