import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getTransactions,
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
import type { TransactionCreateRevenue, TransactionCreateExpense } from '@/shared/types';
import type { TransactionUpdateRevenue, TransactionUpdateExpense } from './api/transactions';

const PAGE_SIZE = 10;

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: object) => ['transactions', 'list', filters] as const,
  detail: (id: number) => ['transactions', id] as const,
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

export function usePropertyRenters(propertyId: number | null) {
  return useQuery({
    queryKey: transactionKeys.propertyRenters(propertyId ?? 0),
    queryFn: () => getPropertyRenters(propertyId!),
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
    },
  });
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
