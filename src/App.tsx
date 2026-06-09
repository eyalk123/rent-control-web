import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/core/auth/AuthContext';
import { ProtectedRoute } from '@/core/auth/ProtectedRoute';
import { AppShell } from '@/layout/AppShell';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { PageLoader } from '@/shared/components/ui/LoadingSpinner';
import { RouteErrorPage } from '@/shared/components/ui/RouteErrorPage';
import { useLanguage } from '@/hooks/useLanguage';

const SignInPage = lazy(() => import('@/features/auth/SignInPage').then((m) => ({ default: m.SignInPage })));
const HomePage = lazy(() => import('@/features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
const PropertiesListPage = lazy(() => import('@/features/properties/pages/PropertiesListPage').then((m) => ({ default: m.PropertiesListPage })));
const PropertyDetailPage = lazy(() => import('@/features/properties/pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })));
const RentersListPage = lazy(() => import('@/features/renters/pages/RentersListPage').then((m) => ({ default: m.RentersListPage })));
const RenterDetailPage = lazy(() => import('@/features/renters/pages/RenterDetailPage').then((m) => ({ default: m.RenterDetailPage })));
const TransactionsListPage = lazy(() => import('@/features/transactions/pages/TransactionsListPage').then((m) => ({ default: m.TransactionsListPage })));
const TransactionDetailPage = lazy(() => import('@/features/transactions/pages/TransactionDetailPage').then((m) => ({ default: m.TransactionDetailPage })));
const SuppliersListPage = lazy(() => import('@/features/suppliers/pages/SuppliersListPage').then((m) => ({ default: m.SuppliersListPage })));
const ReportsHubPage = lazy(() => import('@/features/reports/pages/ReportsHubPage').then((m) => ({ default: m.ReportsHubPage })));
const IncomeExpenseReportPage = lazy(() => import('@/features/reports/pages/IncomeExpenseReportPage').then((m) => ({ default: m.IncomeExpenseReportPage })));
const ExpenseLogReportPage = lazy(() => import('@/features/reports/pages/ExpenseLogReportPage').then((m) => ({ default: m.ExpenseLogReportPage })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PrivacyPolicyPage = lazy(() => import('@/features/legal/pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('@/features/legal/pages/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage })));
const AccessibilityStatementPage = lazy(() => import('@/features/legal/pages/AccessibilityStatementPage').then((m) => ({ default: m.AccessibilityStatementPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1 },
  },
});

const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInPage />, errorElement: <RouteErrorPage /> },
  // Public legal pages (must be reachable without authentication).
  { path: '/privacy', element: <PrivacyPolicyPage />, errorElement: <RouteErrorPage /> },
  { path: '/terms', element: <TermsOfServicePage />, errorElement: <RouteErrorPage /> },
  { path: '/accessibility', element: <AccessibilityStatementPage />, errorElement: <RouteErrorPage /> },
  {
    path: '/',
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'properties', element: <PropertiesListPage /> },
      { path: 'properties/:id', element: <PropertyDetailPage /> },
      { path: 'renters', element: <RentersListPage /> },
      { path: 'renters/:id', element: <RenterDetailPage /> },
      { path: 'transactions', element: <TransactionsListPage /> },
      { path: 'transactions/:id', element: <TransactionDetailPage /> },
      { path: 'suppliers', element: <SuppliersListPage /> },
      { path: 'reports', element: <ReportsHubPage /> },
      { path: 'reports/income-expense', element: <IncomeExpenseReportPage /> },
      { path: 'reports/expense-log', element: <ExpenseLogReportPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
