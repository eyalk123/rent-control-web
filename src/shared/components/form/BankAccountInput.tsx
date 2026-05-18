/*
 * Usage:
 *   const [bankAccount, setBankAccount] = useState({ bank: '', branch: '', account: '' });
 *   <BankAccountInput value={bankAccount} onChange={setBankAccount} />
 *   // on submit: isValidBankAccount(bankAccount) && serialize as "bank/branch/account"
 */
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ISRAELI_BANKS_EN: Record<string, string> = {
  '4': 'Bank Yahav',
  '9': 'Israel Postal Bank',
  '10': 'Bank Leumi',
  '11': 'Discount Bank',
  '12': 'Bank Hapoalim',
  '13': 'Igud Bank',
  '14': 'Bank Otsar Ha-Hayal',
  '17': 'Mercantile Discount',
  '20': 'Mizrahi Tefahot',
  '26': 'Union Bank',
  '31': 'HaBenleumi (FIBI)',
  '46': 'Bank Massad',
  '52': 'Poalei Agudat Israel',
  '54': 'Bank of Jerusalem',
  '59': 'ONE ZERO',
  '68': 'Bank Esh',
};

const ISRAELI_BANKS_HE: Record<string, string> = {
  '4': 'בנק יהב',
  '9': 'בנק הדואר',
  '10': 'בנק לאומי',
  '11': 'בנק דיסקונט',
  '12': 'בנק הפועלים',
  '13': 'בנק אגוד',
  '14': 'בנק אוצר החייל',
  '17': 'מרכנתיל דיסקונט',
  '20': 'בנק מזרחי טפחות',
  '26': 'יובנק',
  '31': 'הבנק הבינלאומי הראשון',
  '46': 'בנק מסד',
  '52': 'בנק פועלי אגודת ישראל',
  '54': 'בנק ירושלים',
  '59': 'וואן זירו',
  '68': 'בנק אש',
};

export type BankAccountValue = { bank: string; branch: string; account: string };

export type BankAccountInputProps = {
  value: BankAccountValue;
  onChange: (value: BankAccountValue) => void;
  onValidChange?: (isValid: boolean) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
};

export function isValidBankAccount(v: BankAccountValue): boolean {
  return (
    /^\d{1,2}$/.test(v.bank) &&
    /^\d{3}$/.test(v.branch) &&
    /^\d{4,9}$/.test(v.account)
  );
}

export function BankAccountInput({
  value,
  onChange,
  onValidChange,
  autoFocus = false,
  disabled = false,
  error,
}: BankAccountInputProps) {
  const { t, i18n } = useTranslation();
  const ISRAELI_BANKS = i18n.language === 'he' ? ISRAELI_BANKS_HE : ISRAELI_BANKS_EN;

  const bankRef = useRef<HTMLInputElement>(null);
  const branchRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLInputElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const focusCount = useRef(0);

  const isComplete = value.bank !== '' || value.branch !== '' || value.account !== '';
  const isValid = isValidBankAccount(value);

  const prevValid = useRef(false);
  useEffect(() => {
    if (onValidChange && prevValid.current !== isValid) {
      prevValid.current = isValid;
      onValidChange(isValid);
    }
  }, [isValid, onValidChange]);

  const borderClass = error
    ? 'border-[var(--color-error)]'
    : isFocused
    ? 'border-[var(--color-primary)]'
    : touched && isComplete
    ? isValid
      ? 'border-emerald-500'
      : 'border-rose-500'
    : 'border-[var(--color-input-border)]';

  const handleFocus = () => {
    focusCount.current += 1;
    setIsFocused(true);
  };

  const handleBlur = () => {
    focusCount.current -= 1;
    setTimeout(() => {
      if (focusCount.current <= 0) {
        focusCount.current = 0;
        setIsFocused(false);
        setTouched(true);
      }
    }, 50);
  };

  const handleBankChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    onChange({ ...value, bank: digits });
    if (digits.length === 2) branchRef.current?.focus();
  };

  const handleBranchChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    onChange({ ...value, branch: digits });
    if (digits.length === 3) accountRef.current?.focus();
  };

  const handleAccountChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 9);
    onChange({ ...value, account: digits });
  };

  const handleBranchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.branch === '') {
      bankRef.current?.focus();
      onChange({ ...value, bank: value.bank.slice(0, -1) });
    }
  };

  const handleAccountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.account === '') {
      branchRef.current?.focus();
      onChange({ ...value, branch: value.branch.slice(0, -1) });
    }
  };

  const bankName = ISRAELI_BANKS[value.bank] ?? (value.bank.length >= 1 ? t('suppliers.unknownBank') : '');

  const inputBase =
    'bg-transparent outline-none text-center font-mono text-sm text-[var(--color-text-primary)] disabled:opacity-50';

  return (
    <div className="flex flex-col gap-1.5">
      {/* dir="ltr" — numeric bank fields are always left-to-right regardless of UI language */}
      <div dir="ltr" className="flex flex-col gap-1">
      <div className={`flex rounded-xl border-2 bg-[var(--color-input-bg)] overflow-hidden transition-colors ${borderClass}`}>
        <input
          ref={bankRef}
          value={value.bank}
          onChange={(e) => handleBankChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label="Bank code"
          className={`${inputBase} w-14 py-2.5`}
        />
        <div className="w-px self-stretch bg-[var(--color-outline)]" />
        <input
          ref={branchRef}
          value={value.branch}
          onChange={(e) => handleBranchChange(e.target.value)}
          onKeyDown={handleBranchKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          disabled={disabled}
          aria-label="Branch code"
          className={`${inputBase} w-16 py-2.5`}
        />
        <div className="w-px self-stretch bg-[var(--color-outline)]" />
        <input
          ref={accountRef}
          value={value.account}
          onChange={(e) => handleAccountChange(e.target.value)}
          onKeyDown={handleAccountKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={9}
          disabled={disabled}
          aria-label="Account number"
          className={`${inputBase} flex-1 py-2.5`}
        />
      </div>

      <div className="flex text-[10px] tracking-wide uppercase text-[var(--color-text-secondary)]">
        <span className="w-14 text-center">{t('suppliers.bankCode')}</span>
        <span className="w-px" />
        <span className="w-16 text-center">{t('suppliers.branchCode')}</span>
        <span className="w-px" />
        <span className="flex-1 text-center">{t('suppliers.accountNumber')}</span>
      </div>
      </div>{/* end ltr wrapper */}

      {bankName && (
        <p className="text-xs text-[var(--color-text-secondary)]" aria-live="polite">
          {bankName}
        </p>
      )}

      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}
