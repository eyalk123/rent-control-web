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
  /**
   * The lease's cadence in words ("Quarterly"), for the off-month cells to explain
   * themselves with. Absent on a monthly lease, which has no off-months.
   */
  cadenceLabel?: string;
}

/**
 * Visual treatment per status.
 *
 * Colour is never the only signal: `paid` also carries a check and `overdue` a triangle, so
 * the grid still reads for a colour-blind user and in the forced-colours high-contrast theme.
 *
 * `outside-lease` has no entry — those months are not drawn at all (see below). `not-due` is
 * drawn, but never as a button: see the dedicated branch in the component.
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

export function RentMonthBox({
  cell,
  monthLabel,
  onSelect,
  saving = false,
  armed = false,
  cadenceLabel,
}: Props) {
  const { t } = useTranslation();

  // Months the lease never covered. Nothing to say about them, so they are not drawn — they
  // only hold their column so the years (and the renters in the property matrix) stay
  // aligned underneath one another.
  if (cell.status === 'outside-lease') {
    return <div className="aspect-square w-full" aria-hidden="true" />;
  }

  // An off-month of a quarterly or yearly cycle. Drawn, but visibly inert.
  //
  // These used to be blank like `outside-lease`, which read as missing data rather than as a
  // deliberate gap: a yearly lease showed eleven holes and looked broken. So the cell keeps
  // its outline and its month name, drops the fill, and carries a dash — present, plainly
  // empty, and plainly not something to act on.
  //
  // It is a `div`, never a disabled `button`. There is no payment to record against a month
  // the lease does not bill for, so the cell should not be focusable, hoverable, or clickable
  // at all — not merely refuse the click.
  if (cell.status === 'not-due') {
    const reason = t('transactions.rentGrid.notDueReason', {
      cadence: (cadenceLabel ?? '').toLowerCase(),
    });
    const label = `${monthLabel}, ${t('transactions.rentStatus.notDue')}${
      cadenceLabel ? ` — ${reason}` : ''
    }`;
    return (
      <div
        role="img"
        aria-label={label}
        title={label}
        data-status="not-due"
        className="flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] text-[13px] font-medium"
        style={{
          // No fill: every actionable state in this grid is a tinted block, so an untinted
          // outline is the one treatment that cannot be mistaken for one of them.
          background: 'transparent',
          border: '1px dashed var(--color-subtle-outline)',
          color: 'var(--color-text-secondary)',
          opacity: 0.55,
        }}
      >
        <span aria-hidden="true">{monthLabel}</span>
        <span aria-hidden="true" className="leading-none">
          –
        </span>
      </div>
    );
  }

  const style = STATUS_STYLE[cell.status];
  const interactive = cell.isPayable || cell.transactions.length > 0;
  const statusLabel = t(`transactions.rentStatus.${cell.status}`);

  // Screen readers get the full story in one string — the visual grid conveys it through
  // position and colour, neither of which survives linearisation.
  const amount = cell.status === 'paid' ? cell.paidSum : cell.expected;
  // A month can hold several payments, and the box shows their *sum* — without this the
  // total reads as one transaction, which is how a triple-recorded month looked like a
  // single wildly wrong one.
  const multiple = cell.transactions.length > 1;
  const countLabel = multiple
    ? t('transactions.rentGrid.paymentsCount', { count: cell.transactions.length })
    : null;
  const ariaLabel = [
    monthLabel,
    statusLabel,
    amount > 0 ? (countLabel ? `${formatMoney(amount)} (${countLabel})` : formatMoney(amount)) : null,
    // A shortfall names what was actually being asked for, which after a lease edit is not
    // the same as what the lease says now. A month that was settled correctly and only
    // disagrees with the *current* lease says so in those words instead — nobody owes
    // anything, and reading "expected X" there would be an accusation.
    cell.hasAmountMismatch
      ? t('transactions.rentGrid.expectedWas', {
          amount: formatMoney(cell.quotedAtPayment ?? cell.expected),
        })
      : null,
    cell.leaseChangedSince
      ? t('transactions.rentGrid.leaseNowSays', { amount: formatMoney(cell.expected) })
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

      {/* Paid, but not the amount that was being asked for at the time — a shortfall or an
          overpayment, and something to chase. Each marker carries its own `title` rather
          than leaning on the button's, so hovering the dot explains the dot and not the
          whole cell. */}
      {cell.hasAmountMismatch && !armed && !saving && (
        <span
          className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--color-warning)' }}
          title={
            multiple
              ? `${t('transactions.rentGrid.legendMismatch')} · ${countLabel}`
              : t('transactions.rentGrid.legendMismatch')
          }
        />
      )}

      {/* Paid exactly what was asked, and the lease has moved since. Deliberately *not*
          the amber dot: nothing went wrong and nobody owes anything, so this is a note
          rather than a warning. It is still shown, because an owner who changed the base
          rent without realising it re-priced three settled years has no other way to find
          out. A hollow ring in the muted text colour reads as "look here" without reading
          as "something is broken", and the two markers never coexist on one cell. */}
      {cell.leaseChangedSince && !armed && !saving && (
        <span
          className="absolute end-1 top-1 h-2.5 w-2.5 rounded-full border"
          style={{ borderColor: 'var(--color-text-secondary)', opacity: 0.75 }}
          title={
            multiple
              ? `${t('transactions.rentGrid.legendLeaseChanged')} · ${countLabel}`
              : t('transactions.rentGrid.legendLeaseChanged')
          }
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
