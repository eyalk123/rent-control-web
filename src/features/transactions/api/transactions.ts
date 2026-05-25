import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockExpenseCategoriesApi, mockTransactionsApi } from '@/core/api/mock';
import type {
  Transaction,
  TransactionCreateRevenue,
  TransactionCreateExpense,
  ExpenseCategory,
  ExpenseCategoryCreate,
  PropertyRenterSummary,
  PaymentMethod,
} from '@/shared/types';

export interface TransactionUpdateRevenue {
  property_id?: number;
  renter_id?: number | null;
  amount?: number;
  date_of_payment?: string;
  month_for?: string;
  payment_method?: PaymentMethod | null;
  notes?: string | null;
}

export interface TransactionUpdateExpense {
  property_id?: number;
  renter_id?: number | null;
  amount?: number;
  date_of_payment?: string;
  payment_method?: PaymentMethod;
  category_id?: number;
  supplier_id?: number | null;
  notes?: string | null;
}

export type TransactionsListParams = {
  type?: 'revenue' | 'expense';
  propertyId?: number;
  renterId?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

export interface MonthSummaryItem {
  key: string;
  year: number;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TransactionSummaryResponse {
  six_month_buckets: MonthSummaryItem[];
}

export async function getTransactions(
  params: TransactionsListParams = {},
): Promise<Transaction[]> {
  if (USE_MOCK_API) {
    return mockTransactionsApi.getTransactions(params);
  }

  const response = await apiClient.get<Transaction[]>('/transactions', {
    params: {
      type: params.type,
      property_id: params.propertyId,
      renter_id: params.renterId,
      q: params.search,
      limit: params.limit,
      offset: params.offset,
    },
  });

  return response.data.map((tx) => ({ ...tx, amount: Number(tx.amount) }));
}

export async function getTransactionsSummary(): Promise<TransactionSummaryResponse> {
  if (USE_MOCK_API) {
    return { six_month_buckets: [] };
  }
  const response = await apiClient.get<TransactionSummaryResponse>('/transactions/summary');
  return response.data;
}

export async function createRevenueTransaction(
  payload: TransactionCreateRevenue,
): Promise<Transaction> {
  if (USE_MOCK_API) {
    return {
      id: Date.now(),
      type: 'revenue',
      property_id: payload.property_id,
      renter_id: payload.renter_id ?? null,
      payment_method: payload.payment_method ?? null,
      date_of_payment: payload.date_of_payment ?? new Date().toISOString().slice(0, 10),
      month_for: payload.month_for,
      amount: payload.amount,
      currency_code: 'ILS',
      category_id: null,
      supplier_id: null,
      notes: payload.notes ?? null,
      property_name: '',
      renter_name: null,
      category_name: null,
      supplier_name: null,
    };
  }

  const response = await apiClient.post<Transaction>(
    '/transactions/revenue',
    payload,
  );
  return response.data;
}

export async function createExpenseTransaction(
  payload: TransactionCreateExpense,
): Promise<Transaction> {
  if (USE_MOCK_API) {
    return {
      id: Date.now(),
      type: 'expense',
      property_id: payload.property_id,
      renter_id: payload.renter_id ?? null,
      payment_method: payload.payment_method,
      date_of_payment: payload.date_of_payment,
      month_for: null,
      amount: payload.amount,
      currency_code: 'ILS',
      category_id: payload.category_id,
      supplier_id: payload.supplier_id ?? null,
      notes: payload.notes ?? null,
      property_name: '',
      renter_name: null,
      category_name: null,
      supplier_name: null,
    };
  }

  const response = await apiClient.post<Transaction>(
    '/transactions/expense',
    payload,
  );
  return response.data;
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  if (USE_MOCK_API) {
    return mockExpenseCategoriesApi.getExpenseCategories();
  }

  const response = await apiClient.get<ExpenseCategory[]>('/expense-categories');
  return response.data;
}

export async function createExpenseCategory(
  name: string,
): Promise<ExpenseCategory> {
  if (USE_MOCK_API) {
    return mockExpenseCategoriesApi.createExpenseCategory({ name });
  }

  const payload: ExpenseCategoryCreate = { name };
  const response = await apiClient.post<ExpenseCategory>(
    '/expense-categories',
    payload,
  );
  return response.data;
}

export async function updateRevenueTransaction(id: number, payload: TransactionUpdateRevenue): Promise<Transaction> {
  if (USE_MOCK_API) return getTransactionById(id);
  const response = await apiClient.patch<Transaction>(`/transactions/revenue/${id}`, payload);
  return response.data;
}

export async function updateExpenseTransaction(id: number, payload: TransactionUpdateExpense): Promise<Transaction> {
  if (USE_MOCK_API) return getTransactionById(id);
  const response = await apiClient.patch<Transaction>(`/transactions/expense/${id}`, payload);
  return response.data;
}

export async function getTransactionById(id: number): Promise<Transaction> {
  if (USE_MOCK_API) {
    const all = await mockTransactionsApi.getTransactions({});
    const found = all.find((t) => t.id === id);
    if (!found) throw new Error('Not found');
    return found;
  }
  const response = await apiClient.get<Transaction>(`/transactions/${id}`);
  return { ...response.data, amount: Number(response.data.amount) };
}

export async function deleteTransaction(id: number): Promise<void> {
  if (USE_MOCK_API) return;
  await apiClient.delete(`/transactions/${id}`);
}

export async function getPropertyRenters(
  propertyId: number,
): Promise<PropertyRenterSummary[]> {
  if (USE_MOCK_API) {
    return mockTransactionsApi.getPropertyRenters(propertyId);
  }

  const response = await apiClient.get<PropertyRenterSummary[]>(
    `/properties/${propertyId}/renters`,
  );
  return response.data;
}
