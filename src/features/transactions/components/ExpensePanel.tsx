import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { LtrSpan } from '@/shared/components/ui/LtrSpan';
import { TransactionRow } from '@/shared/components/detail/TransactionRow';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatMoney } from '@/shared/utils/money';
import type { Transaction } from '@/shared/types';
import { useExpenseCategories } from '../queries';
import { YearChips } from './YearChips';
import {
  buildCategoryTotals,
  buildMonthStacks,
  categoryColor,
  expenseCategoryLabel,
  filterExpensesForYear,
  selectStackCategories,
} from '../utils/expenseBreakdown';

interface Props {
  transactions: Transaction[];
  /**
   * The three selections are lifted to the tab component, which parks them in the query
   * string — switching detail tabs unmounts this panel, and losing the filter every time you
   * glanced at the lease was the complaint.
   */
  year: number | null;
  onYearChange: (year: number) => void;
  month: number | null;
  onMonthChange: (month: number | null) => void;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
}

function formatK(v: number): string {
  if (Math.abs(v) >= 1000) return `₪${(v / 1000).toFixed(0)}k`;
  return `₪${v}`;
}

/**
 * The Expenses half of the detail-page transactions tab.
 *
 * Answers "where does the money go and when" before it answers "what happened": a stacked
 * month chart for seasonality and composition, a ranked category list for share, and the
 * transaction rows underneath — filtered by whatever you clicked.
 */
export function ExpensePanel({
  transactions,
  year: yearProp,
  onYearChange,
  month: selectedMonth,
  onMonthChange,
  category: selectedCategory,
  onCategoryChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const isNarrow = useMediaQuery('(max-width: 1023px)');
  const { data: categories = [] } = useExpenseCategories();

  const monthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
  }, [i18n.language]);

  // Only years that actually have expenses — an empty year chip is a dead end.
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date_of_payment) set.add(Number(tx.date_of_payment.slice(0, 4)));
    }
    return [...set].sort((a, b) => a - b);
  }, [transactions]);

  const currentYear = new Date().getFullYear();
  const year =
    yearProp != null && years.includes(yearProp)
      ? yearProp
      : years.includes(currentYear)
        ? currentYear
        : years[years.length - 1];

  const expenses = useMemo(
    () => (year == null ? [] : filterExpensesForYear(transactions, year)),
    [transactions, year],
  );

  const categoryTotals = useMemo(
    () => buildCategoryTotals(expenses, categories, t),
    [expenses, categories, t],
  );
  const stackCategories = useMemo(
    () => selectStackCategories(categoryTotals, t),
    [categoryTotals, t],
  );
  const stacks = useMemo(
    () => buildMonthStacks(expenses, stackCategories, categories, monthLabels, t),
    [expenses, stackCategories, categories, monthLabels, t],
  );

  const total = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  const monthsWithSpend = stacks.filter((s) => s.total > 0).length;

  const visible = useMemo(
    () =>
      expenses.filter((tx) => {
        if (selectedMonth != null && Number(tx.date_of_payment.slice(5, 7)) - 1 !== selectedMonth) return false;
        if (selectedCategory != null && expenseCategoryLabel(tx, categories, t) !== selectedCategory) return false;
        return true;
      }),
    [expenses, selectedMonth, selectedCategory, categories, t],
  );

  if (year == null || expenses.length === 0) {
    return <EmptyState icon={undefined} title={t('transactions.expenseChart.noExpenses')} />;
  }

  const toggleMonth = (monthIndex: number) =>
    onMonthChange(selectedMonth === monthIndex ? null : monthIndex);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <YearChips
          years={years}
          value={year}
          onChange={(y) => {
            onYearChange(y);
            onMonthChange(null);
            onCategoryChange(null);
          }}
          label={t('transactions.expenseChart.selectYear')}
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label={t('transactions.expenseChart.total')} value={formatMoney(total)} />
        <Kpi
          label={t('transactions.expenseChart.avgPerMonth')}
          value={formatMoney(monthsWithSpend > 0 ? total / monthsWithSpend : 0)}
        />
        <Kpi
          label={t('transactions.expenseChart.topCategory')}
          value={categoryTotals[0]?.label ?? '—'}
          plain
        />
      </div>

      {/* The axis is a numeric/temporal scale, so it stays LTR even in Hebrew. */}
      <div
        className="rounded-[var(--radius-card)] p-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        dir="ltr"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stacks} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              interval={isNarrow ? 'preserveStartEnd' : 0}
              minTickGap={isNarrow ? 24 : 5}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatK}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-input-filled-background)' }}
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-outline)',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v, name) => [formatK(Number(v ?? 0)), String(name)]}
            />
            {stackCategories.map((cat, index) => (
              <Bar
                key={cat.id}
                dataKey={cat.id}
                name={cat.label}
                stackId="expenses"
                fill={categoryColor(index, cat.id)}
                maxBarSize={28}
                cursor="pointer"
              >
                {/* One Cell per month so each segment carries its own month in the
                    closure. The chart-level onClick reports `activeTooltipIndex`, which is
                    whatever the last mouse-move resolved — stale on a cold click and absent
                    on touch, so it selected the wrong month. This needs no hit-testing.
                    Cells also let us dim whatever the selection excludes. */}
                {stacks.map((stack) => {
                  const dimmed =
                    (selectedMonth != null && selectedMonth !== stack.monthIndex) ||
                    (selectedCategory != null && selectedCategory !== cat.id);
                  return (
                    <Cell
                      key={stack.monthIndex}
                      fillOpacity={dimmed ? 0.2 : 0.9}
                      onClick={() => toggleMonth(stack.monthIndex)}
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div
        className="rounded-[var(--radius-card)] p-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        <ul className="flex flex-col gap-2">
          {categoryTotals.map((cat, index) => {
            const active = selectedCategory === cat.id;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(active ? null : cat.id)}
                  aria-pressed={active}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-start transition-colors hover:bg-[var(--color-input-filled-background)]"
                  style={active ? { background: 'var(--color-input-filled-background)' } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: categoryColor(index, cat.id) }}
                    aria-hidden="true"
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[13px]"
                    style={{ color: 'var(--color-text-primary)' }}
                    dir="auto"
                  >
                    <bdi>{cat.label}</bdi>
                  </span>
                  <span
                    className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full"
                    style={{ background: 'var(--color-input-filled-background)' }}
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.max(cat.share * 100, 2)}%`, background: categoryColor(index, cat.id) }}
                    />
                  </span>
                  <span
                    className="w-20 shrink-0 text-end text-[13px] font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    <LtrSpan>{formatMoney(cat.total)}</LtrSpan>
                  </span>
                  <span
                    className="w-10 shrink-0 text-end text-[12px]"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <LtrSpan>{`${Math.round(cat.share * 100)}%`}</LtrSpan>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Filtered rows */}
      {(selectedMonth != null || selectedCategory != null) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          <span>
            {t('transactions.expenseChart.showing', { count: visible.length })}
          </span>
          <button
            type="button"
            onClick={() => {
              onMonthChange(null);
              onCategoryChange(null);
            }}
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('transactions.expenseChart.clearFilter')}
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-[var(--radius-card)]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
      >
        {visible.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <div
      className="rounded-[var(--radius-card)] px-3 py-2.5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <p className="truncate text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p className="mt-0.5 truncate text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {plain ? <bdi>{value}</bdi> : <LtrSpan>{value}</LtrSpan>}
      </p>
    </div>
  );
}
