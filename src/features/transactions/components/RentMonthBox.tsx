import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, HelpCircle } from 'lucide-react';
import type { MonthCell, MonthStatus } from '../utils/rentSchedule';
import { formatMoney } from '@/shared/utils/money';

interface Props {
  cell: MonthCell;
  monthLabel: string;
  onSelect: (cell: MonthCell) => void;
  saving?: boolean;
  /** Clicked once and waiting for the second click that records it. */
  armed?: boolean;
}

/**
 * Visual treatment per status.
 *
 * Colour is never the only signal: `paid` also carries a check and `overdue` a triangle, so
 * the grid still reads for a colour-blind user and in the forced-colours high-contrast theme.
 *
 * `not-due` and `outside-lease` have no entry — they are not drawn at all (see below).
 */
const STATUS_STYLE: Record<
  Exclude<MonthStatus, 'not-due' | 'outside-lease'>,
  { background: string; color: string; border: string }
> = {
  paid: {
    background: 'var(--color-rev-bg)',
    color: 'var(--color-rev-fg)',
    border: '1px solid var(--color-rev-fg)',
  },
  overdue: {
    background: 'var(--color-exp-bg)',
    color: 'var(--color-exp-fg)',
    border: '1px solid var(--color-exp-fg)',
  },
  due: {
    background: 'var(--color-input-filled-background)',
    color: 'var(--color-text-secondary)',
    border: '1px dashed var(--color-outline)',
  },
  // A month that has not arrived yet: present, so the year reads as a year, but plainly
  // inert — flat gray, no glyph, no dashes suggesting something is pending.
  future: {
    background: 'var(--color-input-filled-background)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-subtle-outline)',
    // Muting it further would drop it below the contrast floor; opacity is applied below.
  },
};

export function RentMonthBox({ cell, monthLabel, onSelect, saving = false, armed = false }: Props) {
  const { t } = useTranslation();

  // Months the lease never covered, and the off-months of a quarterly or yearly cycle, are
  // not things the landlord can act on or reason about — drawing them as boxes only invited
  // "what is the difference between these two grays?". They hold their column so the years
  // (and the renters in the property matrix) stay aligned underneath one another.
  if (cell.status === 'not-due' || cell.status === 'outside-lease') {
    return <div className="aspect-square w-full" aria-hidden="true" />;
  }

  const style = STATUS_STYLE[cell.status];
  const interactive = cell.isPayable || cell.transactions.length > 0;
  const statusLabel = t(`transactions.rentStatus.${cell.status}`);

  // Screen readers get the full story in one string — the visual grid conveys it through
  // position and colour, neither of which survives linearisation.
  const amount = cell.status === 'paid' ? cell.paidSum : cell.expected;
  const ariaLabel = [
    monthLabel,
    statusLabel,
    amount > 0 ? formatMoney(amount) : null,
    cell.hasAmountMismatch
      ? t('transactions.rentGrid.expectedWas', { amount: formatMoney(cell.expected) })
      : null,
    cell.isLate ? t('transactions.rentGrid.paidLate') : null,
    armed ? t('transactions.recordPayment.armedHint') : null,
  ]
    .filter(Boolean)
    .join(', ');

  // A tint plus a ring, not a solid fill: every other state in this grid is a soft tint, so
  // a saturated block read as the cell being replaced rather than picked up. The ring is a
  // box-shadow rather than a thicker border — a 2px border would shrink the content box and
  // nudge the label by a pixel mid-transition.
  //
  // Text is `--color-warning-fg`, not `--color-warning`: the mid-ramp amber sits at 2.8:1 on
  // its own tint, worse than the white-on-solid it replaces. The fg token is the dark end of
  // the ramp in light mode and the light end in dark, same as `--color-rev-fg` — 6.2:1 and
  // 8.4:1, both past the paid cell's own 4.7:1.
  const armedStyle = {
    background: 'var(--color-warning-bg)',
    color: 'var(--color-warning-fg)',
    border: '1px solid var(--color-warning)',
    boxShadow: '0 0 0 2px var(--color-warning)',
  };

  const glyphKey = armed || saving ? 'armed' : cell.status;
  const glyph =
    armed || saving ? (
      <HelpCircle size={18} />
    ) : cell.status === 'paid' ? (
      <Check size={18} />
    ) : cell.status === 'overdue' ? (
      <AlertTriangle size={18} />
    ) : null;

  return (
    <button
      type="button"
      disabled={!interactive || saving}
      onClick={() => onSelect(cell)}
      aria-label={ariaLabel}
      aria-pressed={cell.isPayable ? armed : undefined}
      title={ariaLabel}
      // An explicit property list rather than `transition-all`: blanket transitions on a grid
      // of 12 cells are the kind of thing that starts animating layout by accident. Note
      // `scale`, not `transform` — Tailwind v4's `scale-*` compiles to the standalone `scale`
      // property, so a `transform` entry here would silently not animate the lift.
      className={`relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-[background-color,border-color,color,box-shadow,scale,opacity] duration-150 ease-out ${
        armed ? 'z-10 scale-[1.06]' : ''
      } ${
        interactive && !saving ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
      } ${saving ? 'cursor-wait' : ''} ${!interactive ? 'cursor-default' : ''}`}
      style={{
        ...(armed || saving ? armedStyle : style),
        // Hold the armed look while the write is in flight and just dim it. `animate-pulse`
        // is a 2s loop that gets cut off after ~50ms against a fast API — a blink, not
        // feedback.
        opacity: saving ? 0.7 : cell.status === 'future' && !armed ? 0.65 : 1,
      }}
    >
      <span aria-hidden="true">{monthLabel}</span>

      {/* Keyed so React remounts the glyph when it changes, which replays the fade — without
          it the `?` would hard-cut to `✓` in the middle of the colour transition. */}
      {glyph && (
        <span key={glyphKey} aria-hidden="true" style={{ animation: 'fadeIn 0.15s ease' }}>
          {glyph}
        </span>
      )}

      {/* Paid, but not for the amount the lease says — a shortfall or an overpayment.
          Each marker carries its own `title` rather than leaning on the button's, so
          hovering the dot explains the dot and not the whole cell. */}
      {cell.hasAmountMismatch && !armed && !saving && (
        <span
          className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--color-warning)' }}
          title={t('transactions.rentGrid.legendMismatch')}
        />
      )}

      {/* Paid after the due day. */}
      {cell.isLate && !armed && !saving && (
        <span
          className="absolute bottom-1 start-1 h-2.5 w-2.5"
          style={{
            background: 'var(--color-warning)',
            clipPath: 'polygon(0 100%, 100% 100%, 0 0)',
          }}
          title={t('transactions.rentGrid.paidLate')}
        />
      )}
    </button>
  );
}
