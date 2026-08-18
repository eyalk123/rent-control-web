import type { TFunction } from 'i18next';
import type { ExpenseCategory, Transaction } from '@/shared/types';
import { translateCategory } from '@/shared/utils/categories';

/**
 * Aggregates expenses into the shapes the Expenses tab renders: a month × category matrix
 * for the stacked bars, and a ranked category list.
 *
 * Expenses are bucketed by `date_of_payment` — unlike revenue, an expense belongs to the
 * day the money actually moved, which is what `EFFECTIVE_DATE` does on the backend.
 */

/** How many categories get their own stack segment before the rest roll up. */
export const TOP_CATEGORY_COUNT = 6;

export interface CategoryTotal {
  /** Stable identity for colour assignment and selection. */
  id: string;
  label: string;
  total: number;
  share: number;
}

export interface MonthStack {
  monthIndex: number;
  monthLabel: string;
  total: number;
  /** Keyed by CategoryTotal.id. */
  [categoryId: string]: number | string;
}

export const OTHER_CATEGORY_ID = '__other__';

/**
 * Resolves the label for an expense's category.
 *
 * An expense can carry several categories; the stack attributes the whole amount to the
 * first one rather than splitting it, because splitting would invent a breakdown the owner
 * never entered. Predefined categories arrive as `key`, user-created ones as `name`.
 */
export function expenseCategoryLabel(
  tx: Transaction,
  categories: ExpenseCategory[],
  t: TFunction,
): string {
  const id = tx.category_ids?.[0] ?? tx.category_id;
  const match = id != null ? categories.find((c) => c.id === id) : undefined;
  if (match?.key) return translateCategory(match.key, t);
  if (match?.name) return match.name;
  if (tx.category_name) return translateCategory(tx.category_name, t);
  return t('transactions.uncategorized');
}

export function filterExpensesForYear(transactions: Transaction[], year: number): Transaction[] {
  return transactions.filter(
    (tx) => tx.type === 'expense' && tx.date_of_payment?.slice(0, 4) === String(year),
  );
}

export function buildCategoryTotals(
  expenses: Transaction[],
  categories: ExpenseCategory[],
  t: TFunction,
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const tx of expenses) {
    const label = expenseCategoryLabel(tx, categories, t);
    totals.set(label, (totals.get(label) ?? 0) + tx.amount);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([label, total]) => ({ id: label, label, total, share: grand > 0 ? total / grand : 0 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * The categories that get their own stack segment, plus a rolled-up "Other".
 *
 * With twelve built-in categories and any number of user-created ones, an uncapped stack
 * produces a legend longer than the chart and colours no one can tell apart.
 */
export function selectStackCategories(
  categoryTotals: CategoryTotal[],
  t: TFunction,
): CategoryTotal[] {
  if (categoryTotals.length <= TOP_CATEGORY_COUNT) return categoryTotals;
  const top = categoryTotals.slice(0, TOP_CATEGORY_COUNT);
  const rest = categoryTotals.slice(TOP_CATEGORY_COUNT);
  const restTotal = rest.reduce((sum, c) => sum + c.total, 0);
  const restShare = rest.reduce((sum, c) => sum + c.share, 0);
  return [
    ...top,
    { id: OTHER_CATEGORY_ID, label: t('transactions.expenseChart.otherCategories'), total: restTotal, share: restShare },
  ];
}

export function buildMonthStacks(
  expenses: Transaction[],
  stackCategories: CategoryTotal[],
  categories: ExpenseCategory[],
  monthLabels: string[],
  t: TFunction,
): MonthStack[] {
  const named = new Set(stackCategories.map((c) => c.id).filter((id) => id !== OTHER_CATEGORY_ID));

  const stacks: MonthStack[] = monthLabels.map((monthLabel, monthIndex) => {
    const row: MonthStack = { monthIndex, monthLabel, total: 0 };
    for (const cat of stackCategories) row[cat.id] = 0;
    return row;
  });

  for (const tx of expenses) {
    const monthIndex = Number(tx.date_of_payment.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;
    const label = expenseCategoryLabel(tx, categories, t);
    const bucket = named.has(label) ? label : OTHER_CATEGORY_ID;
    const row = stacks[monthIndex];
    if (row[bucket] === undefined) continue;
    row[bucket] = (row[bucket] as number) + tx.amount;
    row.total += tx.amount;
  }

  return stacks;
}

/**
 * Palette for the stack segments.
 *
 * Six hues chosen to stay distinguishable against both themes and under the common forms
 * of colour blindness; they are categorical, so no ordering is implied. "Other" is
 * deliberately the neutral grey at the end.
 */
export const CATEGORY_COLORS = [
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
];

export function categoryColor(index: number, id: string): string {
  if (id === OTHER_CATEGORY_ID) return 'var(--color-text-secondary)';
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
