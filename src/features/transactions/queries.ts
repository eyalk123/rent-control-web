import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getTransactions,
  getAllTransactions,
  getTransactionById,
  createRevenueTransaction,
  createExpenseTransaction,
  updateRevenueTransaction,
  updateExpenseTransaction,
  deleteTransaction,
  getTransactionsSummary as getTransactionSummary,
  getPropertyRenters,
  getExpenseCategories,
  createExpenseCategory,
} from './api/transactions';
import { retryNon4xx } from '@/core/api/queryRetry';
import { notificationKeys } from '@/features/notifications/queries';
import { normalizePaymentType } from '@/shared/constants/paymentMethods';
import type { TransactionCreateRevenue, TransactionCreateExpense } from '@/shared/types';
import type { TransactionsListParams, TransactionUpdateRevenue, TransactionUpdateExpense } from './api/transactions';

const PAGE_SIZE = 10;

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: object) => ['transactions', 'list', filters] as const,
  detail: (id: number) => ['transactions', id] as const,
  allList: (filters: object) => ['transactions', 'all-list', filters] as const,
  summary: ['transactions', 'summary'] as const,
  categories: ['expense-categories'] as const,
  propertyRenters: (pid: number) => ['property-renters', pid] as const,
};

export function useTransactions(filters: Record<string, unknown> = {}) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam = 0 }) =>
      getTransactions({ ...filters, offset: pageParam as number, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap((p) => p).length;
      return (lastPage as unknown[]).length < PAGE_SIZE ? undefined : loaded;
    },
    initialPageParam: 0,
  });
}

/**
 * Every matching transaction, not just the first page.
 *
 * The detail tabs need the whole history: a payment grid cannot tell paid from unpaid if it
 * only sees the ten most recent rows, and the same cap was already skewing the hero YTD
 * totals. `getAllTransactions` pages at 100 under the hood.
 */
export function useAllTransactions(
  filters: Omit<TransactionsListParams, 'limit' | 'offset'>,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: transactionKeys.allList(filters),
    queryFn: () => getAllTransactions(filters),
    enabled: options.enabled ?? true,
  });
}

export function useTransactionSummary() {
  return useQuery({ queryKey: transactionKeys.summary, queryFn: getTransactionSummary });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransactionById(id),
    enabled: id > 0,
    retry: retryNon4xx,
  });
}

export function useExpenseCategories() {
  return useQuery({ queryKey: transactionKeys.categories, queryFn: getExpenseCategories, staleTime: Infinity });
}

/**
 * `includeEnded` is what the transaction form asks for. A payment can arrive after a
 * tenancy finishes — the last month's rent routinely lands late — and editing an old
 * transaction has to show the renter it is already attached to, or the select renders an
 * empty trigger and the next save silently detaches it.
 */
export function usePropertyRenters(propertyId: number | null, includeEnded = false) {
  return useQuery({
    queryKey: [...transactionKeys.propertyRenters(propertyId ?? 0), includeEnded],
    queryFn: () => getPropertyRenters(propertyId!, includeEnded),
    enabled: !!propertyId,
  });
}

export function useCreateRevenueTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreateRevenue) => createRevenueTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
      qc.invalidateQueries({ queryKey: ['home'] });
      // Recording rent resolves any overdue alert; refresh the feed.
      qc.invalidateQueries({ queryKey: notificationKeys.feed });
    },
  });
}

export interface MarkRentPaidInput {
  property_id: number;
  renter_id: number | null;
  amount: number;
  /** "YYYY-MM" — the month the rent is *for*, which is rarely the month it arrives in. */
  monthFor: string;
  /** The renter's stored payment_type; normalized to a PaymentMethod here. */
  paymentType?: string | null;
}

/**
 * Records a rent payment in one shot — the affordance behind "Mark paid" on an overdue
 * alert and behind an unpaid box on the payment grid.
 *
 * There is no mark-as-paid endpoint: paid *is* the existence of a revenue row for that
 * month, so this simply creates one. Callers must pass the month the rent is for; the
 * alert path used to hardcode the current month, which mis-filed a payment for an alert
 * raised about an earlier one.
 */
export function useMarkRentPaid() {
  const createRevenue = useCreateRevenueTransaction();
  return {
    ...createRevenue,
    markPaid: (input: MarkRentPaidInput) =>
      createRevenue.mutateAsync({
        property_id: input.property_id,
        renter_id: input.renter_id,
        amount: input.amount,
        date_of_payment: new Date().toISOString().slice(0, 10),
        month_for: `${input.monthFor}-01`,
        payment_method: normalizePaymentType(input.paymentType),
      }),
  };
}

export function useCreateExpenseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionCreateExpense) => createExpenseTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useUpdateRevenueTransaction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionUpdateRevenue) => updateRevenueTransaction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}

export function useUpdateExpenseTransaction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionUpdateExpense) => updateExpenseTransaction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.categories }),
  });
}
