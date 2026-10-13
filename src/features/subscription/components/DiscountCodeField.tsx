import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Loader2, TicketPercent, X } from 'lucide-react';
import type { DiscountLookup } from '../api/subscriptionApi';

/** Minor units → major, using the currency's own number of decimals (none for JPY). */
function fromMinor(amount: string, currency: string): number {
  const digits =
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return Number(amount) / 10 ** digits;
}

/** "20%" or "$10" — what the code takes off, on its own. */
export function discountOff(lookup: DiscountLookup, locale: string): string {
  if (lookup.type === 'flat' && lookup.amount && lookup.currency_code) {
    const value = fromMinor(lookup.amount, lookup.currency_code);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: lookup.currency_code,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  }
  return `${Number(lookup.amount)}%`;
}

/** The whole offer in one sentence: "20% off your first 3 payments". */
export function discountTerms(t: TFunction, lookup: DiscountLookup, locale: string): string {
  const off = discountOff(lookup, locale);
  if (!lookup.recur) return t('subscription.plans.discount.termsFirst', { off });
  if (lookup.maximum_recurring_intervals === null) return t('subscription.plans.discount.termsAlways', { off });
  return t('subscription.plans.discount.termsFirstN', { off, count: lookup.maximum_recurring_intervals });
}

interface Props {
  draft: string;
  onDraftChange: (value: string) => void;
  /** A code the server confirmed. Drawn as the ticket. */
  applied: DiscountLookup | null;
  /** A code we could not check (Paddle unreachable). Still sent to checkout, which decides. */
  unverified: string | null;
  checking: boolean;
  /** Why the last code cannot be used, already in words. */
  error: string | null;
  onApply: () => void;
  onRemove: () => void;
}

/**
 * The discount code control on `/plans`, in three shapes: a quiet "Have a discount code?"
 * button, an entry field with its own Apply button, and — once the server has confirmed the
 * code — a ticket stub naming the code and what it gives.
 *
 * It sits beside the billing-period toggle, at the same height, because both change the
 * prices on the cards below; the cards then show the discounted price themselves.
 */
export function DiscountCodeField({
  draft,
  onDraftChange,
  applied,
  unverified,
  checking,
  error,
  onApply,
  onRemove,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(Boolean(draft || applied || unverified));
  const inputRef = useRef<HTMLInputElement>(null);
  // Focus follows the user's action: into the field when it opens, back to it on removal.
  const [focusInput, setFocusInput] = useState(false);

  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
      setFocusInput(false);
    }
  }, [focusInput, open, applied]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim() && !checking) onApply();
  };

  if (applied) {
    return (
      <div className="w-full sm:w-auto" aria-live="polite">
        <div
          className="relative flex items-stretch min-h-[46px] rounded-[11px] sm:max-w-[420px]"
          style={{
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span className="flex items-center gap-2 ps-3.5 pe-3 shrink-0">
            <TicketPercent size={17} strokeWidth={2.2} aria-hidden="true" />
            <span
              dir="ltr"
              className="text-[13.5px] font-bold uppercase"
              style={{ letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
            >
              {applied.code}
            </span>
          </span>

          {/* The perforation: a dashed tear line with a bite out of each edge. Zero width, so
              the bites centre on it in either text direction. */}
          <span aria-hidden="true" className="relative shrink-0 w-0">
            <span
              className="absolute"
              style={{ top: 9, bottom: 9, insetInlineStart: -0.75, borderInlineStart: '1.5px dashed currentColor', opacity: 0.45 }}
            />
            <span
              className="absolute w-3 h-3 rounded-full"
              style={{ top: -6, insetInlineStart: -6, background: 'var(--color-background)' }}
            />
            <span
              className="absolute w-3 h-3 rounded-full"
              style={{ bottom: -6, insetInlineStart: -6, background: 'var(--color-background)' }}
            />
          </span>

          <span className="flex-1 min-w-0 flex items-center ps-3 pe-1 py-2 text-[13.5px] leading-snug font-medium">
            {discountTerms(t, applied, i18n.language)}
          </span>

          <button
            type="button"
            onClick={() => {
              onRemove();
              setFocusInput(true);
            }}
            aria-label={t('subscription.plans.discount.remove', { code: applied.code })}
            title={t('subscription.plans.discount.remove', { code: applied.code })}
            className="shrink-0 self-center me-1.5 h-8 w-8 rounded-[8px] inline-flex items-center justify-center transition-colors hover:bg-[var(--color-surface)]"
            style={{ background: 'transparent', border: 'none', color: 'inherit' }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        {applied.plans !== null && (
          <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subscription.plans.discount.somePlans')}
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setFocusInput(true);
        }}
        className="h-[46px] px-4 rounded-[11px] inline-flex items-center gap-2 text-[13.5px] font-semibold transition-colors hover:text-[var(--color-text-primary)]"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-outline)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <TicketPercent size={17} strokeWidth={2.2} aria-hidden="true" />
        {t('subscription.plans.discountToggle')}
      </button>
    );
  }

  const message = error ?? (unverified ? t('subscription.plans.discount.unverified') : null);

  return (
    <div className="w-full sm:w-[340px]">
      {/* The input keeps the app's own focus ring (index.css forces it on every
          :focus-visible); the frame only tints its border to match. Classes rather than an
          inline style, or focus-within could not change it. */}
      <form
        onSubmit={submit}
        className={`flex items-center h-[46px] p-1 rounded-[11px] border transition-colors ${
          error
            ? 'border-[var(--color-error)]'
            : 'border-[var(--color-outline)] focus-within:border-[var(--color-primary)]'
        }`}
        style={{ background: 'var(--color-surface)' }}
      >
        <TicketPercent
          size={17}
          strokeWidth={2.2}
          aria-hidden="true"
          className="shrink-0 mx-2.5"
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t('subscription.plans.discountLabel')}
          aria-label={t('subscription.plans.discountLabel')}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? 'discount-code-message' : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          maxLength={32}
          className="flex-1 min-w-0 h-full px-1 rounded-[6px] bg-transparent text-[14px] font-semibold uppercase placeholder:normal-case placeholder:font-normal"
          style={{ color: 'var(--color-text-primary)', letterSpacing: draft ? '0.08em' : undefined, border: 'none' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || checking}
          className="shrink-0 h-9 px-4 rounded-[8px] text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: 'none',
            cursor: !draft.trim() || checking ? 'not-allowed' : 'pointer',
          }}
        >
          {checking && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {t(checking ? 'subscription.plans.discount.checking' : 'subscription.plans.discount.apply')}
        </button>
      </form>
      <p
        id="discount-code-message"
        aria-live="polite"
        className={message ? 'mt-1.5 text-[12.5px] leading-snug' : 'sr-only'}
        style={{ color: error ? 'var(--color-error)' : 'var(--color-text-secondary)' }}
      >
        {message}
      </p>
    </div>
  );
}
