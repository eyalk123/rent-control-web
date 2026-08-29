import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useToast } from '@/shared/components/ui/Toast';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { formatMoney } from '@/shared/utils/money';
import type { Renter, Transaction } from '@/shared/types';
import { useMarkRentPaid } from '../queries';
import { TransactionFormDrawer } from '../pages/TransactionFormDrawer';
import {
  buildRentGrid,
  listPayableYearsForRenters,
  summariseRentYear,
  type MonthCell,
} from '../utils/rentSchedule';
import { MonthPaymentsDialog } from './MonthPaymentsDialog';
import { RentMonthBox } from './RentMonthBox';
import { YearChips } from './YearChips';

interface Props {
  /** One renter on a renter page; every renter on the property (past ones included) on a property page. */
  renters: Renter[];
  transactions: Transaction[];
  /** Fallback when a renter has no property_id of their own (renter page passes the page's property). */
  propertyId?: number | null;
  /**
   * `stacked` shows every lease year at once, newest first — the renter page, where the run
   * of years *is* the lease. `single-year` keeps the year chips, for the property matrix
   * where every extra year multiplies by the number of renters.
   */
  layout?: 'stacked' | 'single-year';
  /** `single-year` only: the selected year, lifted so it survives a tab switch. */
  year?: number | null;
  onYearChange?: (year: number) => void;
}

function useMonthLabels(): string[] {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
  }, [i18n.language]);
}

interface Armed {
  renter: Renter;
  cell: MonthCell;
}

interface GridRow {
  renter: Renter;
  cells: MonthCell[];
}

/** Identifies one box in the grid. The property matrix repeats months across renters. */
const cellKey = (renterId: number, monthKey: string) => `${renterId}:${monthKey}`;

/**
 * The Revenue half of the detail-page transactions tab: a 12-month payment grid per
 * renter, per calendar year.
 *
 * One renter renders as a single strip; a property with several renders as a
 * renter × month matrix, which is what makes turnover legible — you can see one lease end
 * mid-year and the next begin. Past renters get real rows because `GET /properties/{id}`
 * returns every renter with their lease intact, not just the active ones.
 */
export function RevenuePaymentPanel({
  renters,
  transactions,
  propertyId,
  layout = 'single-year',
  year: yearProp,
  onYearChange,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const monthLabels = useMonthLabels();
  const { markPaid } = useMarkRentPaid();

  const years = useMemo(() => listPayableYearsForRenters(renters), [renters]);
  const [armed, setArmed] = useState<Armed | null>(null);
  // Every cell currently being written, not a single in-flight flag — recording a run of
  // months should never make you wait for the previous one to land.
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<Armed | null>(null);
  // The month whose payment list is open — set only when a month holds more than one.
  const [viewing, setViewing] = useState<Armed | null>(null);
  // Successes since the last time the grid went quiet, so a run of months produces one
  // summary toast instead of one per click.
  const recorded = useRef(0);
  // Spans the grid *and* the hint line below it. Scoping this to the grid alone made the
  // hint's "Edit details" button unclickable: `pointerdown` landed outside, disarmed, and
  // unmounted the button before its `click` could fire.
  const armSurfaceRef = useRef<HTMLDivElement>(null);

  // Default to the current year when the lease covers it, else the most recent year that
  // does — a lease that ended in 2024 should open on 2024, not on an empty 2026.
  const currentYear = new Date().getFullYear();
  const selectedYear =
    yearProp != null && years.includes(yearProp)
      ? yearProp
      : years.includes(currentYear)
        ? currentYear
        : years[years.length - 1];

  // Newest first in the stack: the year you are most likely to be recording against is the
  // one you land on, without scrolling past the history to reach it.
  const shownYears = useMemo(
    () => (layout === 'stacked' ? [...years].reverse() : selectedYear != null ? [selectedYear] : []),
    [layout, years, selectedYear],
  );

  const rowsByYear = useMemo(() => {
    const map = new Map<number, GridRow[]>();
    for (const y of shownYears) {
      map.set(
        y,
        renters
          .map((renter) => ({
            renter,
            cells: buildRentGrid(
              renter,
              y,
              transactions.filter((tx) => tx.renter_id === renter.id),
            ),
          }))
          // A renter whose lease does not reach into this year has nothing to show.
          .filter(({ cells }) => cells.some((c) => c.status !== 'outside-lease')),
      );
    }
    return map;
  }, [renters, transactions, shownYears]);

  // Release committed cells as the refreshed data confirms them, and announce the batch once
  // the grid has caught up with every click. Driving this off the data rather than off the
  // mutation promise is what makes overlapping writes safe: `invalidateQueries` resolutions
  // supersede one another when several land at once, so an earlier write's promise can come
  // back before its own refetch has.
  useEffect(() => {
    // A cell can also be released outside the data path — when the write was refused
    // because the month was already recorded, nothing changes in the data to release it.
    // That must not swallow the summary toast for the writes that did land.
    if (pending.size === 0) {
      if (recorded.current > 0) {
        const count = recorded.current;
        recorded.current = 0;
        showToast(
          count === 1
            ? t('transactions.rentGrid.paymentRecorded')
            : t('transactions.rentGrid.paymentsRecorded', { count }),
          'success',
        );
      }
      return;
    }
    const paid = new Set<string>();
    for (const rows of rowsByYear.values()) {
      for (const { renter, cells } of rows) {
        for (const c of cells) {
          if (c.status === 'paid') paid.add(cellKey(renter.id, c.monthKey));
        }
      }
    }
    const remaining = [...pending].filter((k) => !paid.has(k));
    if (remaining.length === pending.size) return;

    setPending(new Set(remaining));
    if (remaining.length === 0 && recorded.current > 0) {
      const count = recorded.current;
      recorded.current = 0;
      showToast(
        count === 1
          ? t('transactions.rentGrid.paymentRecorded')
          : t('transactions.rentGrid.paymentsRecorded', { count }),
        'success',
      );
    }
  }, [rowsByYear, pending, showToast, t]);

  // Arming is a transient gesture — anything that moves the user's attention drops it, so a
  // stale amber box can never be committed by a click meant for something else.
  useEffect(() => {
    if (!armed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArmed(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!armSurfaceRef.current?.contains(e.target as Node)) setArmed(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [armed]);

  if (renters.length === 0 || shownYears.length === 0) {
    return <EmptyState icon={undefined} title={t('transactions.rentGrid.noLease')} />;
  }

  const record = async ({ renter, cell }: Armed) => {
    const key = cellKey(renter.id, cell.monthKey);
    const targetProperty = renter.property_id ?? propertyId;
    if (!targetProperty) {
      showToast(t('transactions.rentGrid.noPropertyLinked'), 'error');
      setArmed(null);
      return;
    }

    // Disarm on commit rather than on completion. The gesture is finished the moment the
    // second click lands, so the next month can be armed straight away; waiting until the
    // write returned meant a month armed during the previous flight got wiped by it.
    setArmed((prev) => (prev && cellKey(prev.renter.id, prev.cell.monthKey) === key ? null : prev));
    setPending((prev) => new Set(prev).add(key));

    try {
      const result = await markPaid({
        property_id: targetProperty,
        renter_id: renter.id,
        amount: cell.expected,
        monthFor: cell.monthKey,
        paymentType: renter.payment_type,
      });
      if (!result.created) {
        // Nothing was written, so the data will never change to release this cell — and
        // the grid should not have offered the box in the first place. Say so and let go.
        showToast(t('transactions.rentGrid.markPaid.alreadyRecorded'), 'default');
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return;
      }
      recorded.current += 1;
      // Deliberately *not* clearing `pending` here. The write returning only means the row
      // exists on the server; the grid derives "paid" from the transaction list, which has
      // not refetched yet. The effect below releases the cell when the data actually shows
      // it — otherwise the box drops back to red for the gap in between, and with several
      // writes overlapping that gap is neither short nor predictable.
    } catch {
      showToast(t('error.saveTransactionFailed'), 'error');
      // A failed write is never going to show up in the data, so release it here.
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  /**
   * Two clicks to record, but no dialog: the first arms the box, the second commits it.
   * Clicking a different box just moves the arming, so recording a run of months costs two
   * clicks each with nothing to dismiss in between.
   */
  const handleSelect = (renter: Renter, cell: MonthCell) => {
    if (cell.isPayable) {
      // Already being written — ignore, so a stray second click cannot double-charge a month.
      if (pending.has(cellKey(renter.id, cell.monthKey))) return;
      if (armed && armed.renter.id === renter.id && armed.cell.monthKey === cell.monthKey) {
        void record({ renter, cell });
      } else {
        setArmed({ renter, cell });
      }
      return;
    }
    // A paid box is a shortcut into the money it represents — but only when there is one
    // row behind it. A month with several is exactly the case the old straight-to-the-first
    // navigation lied about, so it gets the list instead.
    if (cell.transactions.length === 1) {
      navigate(`/transactions/${cell.transactions[0].id}`);
    } else if (cell.transactions.length > 1) {
      setViewing({ renter, cell });
    }
  };

  const renderRow = ({ renter, cells }: GridRow, showName: boolean) => (
    <div key={renter.id} className="mb-3 last:mb-0">
      {showName && (
        <p
          className="mb-1.5 truncate text-[13px] font-medium"
          style={{ color: 'var(--color-text-primary)' }}
          dir="auto"
        >
          <bdi>{`${renter.first_name} ${renter.last_name}`}</bdi>
        </p>
      )}
      {/* Two rows of six on a phone: twelve across 390px leaves ~38px cells, below
          a usable touch target. Six keeps them at ~50px. `data-dense-grid` tells
          the mobile layout guard this is a calendar, not a collapsed panel —
          see e2e/mobile.spec.ts. */}
      <div data-dense-grid className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {cells.map((cell) => (
          <RentMonthBox
            key={cell.monthKey}
            cell={cell}
            monthLabel={monthLabels[cell.monthIndex]}
            onSelect={(c) => handleSelect(renter, c)}
            armed={armed?.renter.id === renter.id && armed?.cell.monthKey === cell.monthKey}
            saving={pending.has(cellKey(renter.id, cell.monthKey))}
          />
        ))}
      </div>
    </div>
  );

  const yearSummary = (rows: GridRow[]) => {
    const totals = summariseRentYear(rows.flatMap((r) => r.cells));
    return (
      <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        {t('transactions.rentGrid.summary', {
          collected: formatMoney(totals.collected),
          expected: formatMoney(totals.expected),
        })}
        {totals.outstandingMonths > 0 && (
          <span style={{ color: 'var(--color-exp-fg)' }}>
            {' · '}
            {t(
              totals.outstandingMonths === 1
                ? 'transactions.rentGrid.outstanding'
                : 'transactions.rentGrid.outstanding_plural',
              { count: totals.outstandingMonths },
            )}
          </span>
        )}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {layout === 'single-year' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <YearChips
            years={years}
            value={shownYears[0]}
            onChange={(y) => onYearChange?.(y)}
            label={t('transactions.rentGrid.selectYear')}
          />
          {yearSummary(rowsByYear.get(shownYears[0]) ?? [])}
        </div>
      )}

      <div ref={armSurfaceRef} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {shownYears.map((y) => {
            const rows = rowsByYear.get(y) ?? [];
            if (rows.length === 0) return null;
            return (
              <div
                key={y}
                data-year={y}
                className="rounded-[var(--radius-card)] p-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-outline)',
                }}
              >
                {layout === 'stacked' && (
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span
                      className="text-[15px] font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                      dir="ltr"
                    >
                      {y}
                    </span>
                    {yearSummary(rows)}
                  </div>
                )}
                {rows.map((row) => renderRow(row, rows.length > 1))}
              </div>
            );
          })}
        </div>

        {/* The armed hint doubles as the confirmation copy — it names the month and the
            amount the second click will write, which a colour change on a 50px box cannot.

            Always mounted, at a fixed height: mounting it on arm shifted everything below by
            a line whenever the text wrapped, so every click nudged the page. A live region
            also wants to exist before its content changes, or the first one goes
            unannounced. */}
        <div aria-live="polite" className="h-5 overflow-hidden">
          <div
            className="transition-opacity duration-150"
            style={{ opacity: armed ? 1 : 0 }}
            aria-hidden={armed ? undefined : true}
          >
            {armed && (
              <p
                className="truncate text-[13px] leading-5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span style={{ color: 'var(--color-warning)' }}>
                  {t('transactions.recordPayment.armed', {
                    month: `${monthLabels[armed.cell.monthIndex]} ${armed.cell.monthKey.slice(0, 4)}`,
                  })}
                </span>{' '}
                <LtrSpan>{formatMoney(armed.cell.expected)}</LtrSpan>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(armed);
                    setArmed(null);
                  }}
                  className="font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('transactions.recordPayment.editDetails')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <Legend />

      <MonthPaymentsDialog
        open={viewing != null}
        onClose={() => setViewing(null)}
        cell={viewing?.cell ?? null}
        monthLabel={
          viewing
            ? `${monthLabels[viewing.cell.monthIndex]} ${viewing.cell.monthKey.slice(0, 4)}`
            : ''
        }
      />

      <TransactionFormDrawer
        open={editing != null}
        onClose={() => setEditing(null)}
        initialType="revenue"
        initialPropertyId={(editing?.renter.property_id ?? propertyId) ?? undefined}
        initialRenterId={editing?.renter.id}
        initialMonth={editing?.cell.monthKey}
      />
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  const items: { key: string; swatch: React.CSSProperties }[] = [
    { key: 'paid', swatch: { background: 'var(--color-rev-bg)', border: '1px solid var(--color-rev-fg)' } },
    { key: 'overdue', swatch: { background: 'var(--color-exp-bg)', border: '1px solid var(--color-exp-fg)' } },
    { key: 'due', swatch: { background: 'var(--color-input-filled-background)', border: '1px dashed var(--color-outline)' } },
    {
      key: 'future',
      swatch: {
        background: 'var(--color-input-filled-background)',
        border: '1px solid var(--color-subtle-outline)',
        opacity: 0.65,
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={item.swatch} aria-hidden="true" />
          {t(`transactions.rentStatus.${item.key}`)}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-warning)' }} aria-hidden="true" />
        {t('transactions.rentGrid.legendMismatch')}
      </span>
      {/* The late marker was the one indicator with no legend entry. */}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5"
          style={{ background: 'var(--color-warning)', clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }}
          aria-hidden="true"
        />
        {t('transactions.rentGrid.legendLate')}
      </span>
    </div>
  );
}
