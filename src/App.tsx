import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/core/auth/AuthContext';
import { ProtectedRoute } from '@/core/auth/ProtectedRoute';
import { AppShell } from '@/layout/AppShell';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';

const SignInPage = lazy(() => import('@/features/auth/SignInPage').then((m) => ({ default: m.SignInPage })));
const HomePage = lazy(() => import('@/features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
const PropertiesListPage = lazy(() => import('@/features/properties/pages/PropertiesListPage').then((m) => ({ default: m.PropertiesListPage })));
const AddEditPropertyPage = lazy(() => import('@/features/properties/pages/AddEditPropertyPage').then((m) => ({ default: m.AddEditPropertyPage })));
const PropertyDetailPage = lazy(() => import('@/features/properties/pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })));
const RentersListPage = lazy(() => import('@/features/renters/pages/RentersListPage').then((m) => ({ default: m.RentersListPage })));
const AddEditRenterPage = lazy(() => import('@/features/renters/pages/AddEditRenterPage').then((m) => ({ default: m.AddEditRenterPage })));
const RenterDetailPage = lazy(() => import('@/features/renters/pages/RenterDetailPage').then((m) => ({ default: m.RenterDetailPage })));
const TransactionsListPage = lazy(() => import('@/features/transactions/pages/TransactionsListPage').then((m) => ({ default: m.TransactionsListPage })));
const AddTransactionPage = lazy(() => import('@/features/transactions/pages/AddTransactionPage').then((m) => ({ default: m.AddTransactionPage })));
const TransactionDetailPage = lazy(() => import('@/features/transactions/pages/TransactionDetailPage').then((m) => ({ default: m.TransactionDetailPage })));
const SuppliersListPage = lazy(() => import('@/features/suppliers/pages/SuppliersListPage').then((m) => ({ default: m.SuppliersListPage })));
const AddEditSupplierPage = lazy(() => import('@/features/suppliers/pages/AddEditSupplierPage').then((m) => ({ default: m.AddEditSupplierPage })));
const ReportsHubPage = lazy(() => import('@/features/reports/pages/ReportsHubPage').then((m) => ({ default: m.ReportsHubPage })));
const IncomeExpenseReportPage = lazy(() => import('@/features/reports/pages/IncomeExpenseReportPage').then((m) => ({ default: m.IncomeExpenseReportPage })));
const ExpenseLogReportPage = lazy(() => import('@/features/reports/pages/ExpenseLogReportPage').then((m) => ({ default: m.ExpenseLogReportPage })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const DeleteAccountPage = lazy(() => import('@/features/settings/pages/DeleteAccountPage').then((m) => ({ default: m.DeleteAccountPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1 },
  },
});

const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'properties', element: <PropertiesListPage /> },
      { path: 'properties/add', element: <AddEditPropertyPage /> },
      { path: 'properties/:id', element: <PropertyDetailPage /> },
      { path: 'properties/:id/edit', element: <AddEditPropertyPage /> },
      { path: 'renters', element: <RentersListPage /> },
      { path: 'renters/add', element: <AddEditRenterPage /> },
      { path: 'renters/:id', element: <RenterDetailPage /> },
      { path: 'renters/:id/edit', element: <AddEditRenterPage /> },
      { path: 'transactions', element: <TransactionsListPage /> },
      { path: 'transactions/add', element: <AddTransactionPage /> },
      { path: 'transactions/:id', element: <TransactionDetailPage /> },
      { path: 'transactions/:id/edit', element: <AddTransactionPage /> },
      { path: 'suppliers', element: <SuppliersListPage /> },
      { path: 'suppliers/add', element: <AddEditSupplierPage /> },
      { path: 'suppliers/:id/edit', element: <AddEditSupplierPage /> },
      { path: 'reports', element: <ReportsHubPage /> },
      { path: 'reports/income-expense', element: <IncomeExpenseReportPage /> },
      { path: 'reports/expense-log', element: <ExpenseLogReportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/delete-account', element: <DeleteAccountPage /> },
    ],
  },
]);

export default function App() {
  useLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
