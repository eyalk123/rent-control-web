// Adapted from rent-control mobile 2026-05-14.
// expo-file-system + expo-sharing replaced with browser Blob URL download.
import apiClient from '@/core/api/client';
import { downloadFile } from '@/shared/utils/download';

export interface ReportExport {
  id: number;
  report_type: 'income_expense' | 'expense_log';
  year: number;
  format: 'pdf' | 'csv';
  created_at: string;
}

export type ReportFormat = 'pdf' | 'csv';

export async function getReportHistory(): Promise<ReportExport[]> {
  const response = await apiClient.get<ReportExport[]>('/reports/history');
  return response.data;
}

export async function deleteReportExport(id: number): Promise<void> {
  await apiClient.delete(`/reports/history/${id}`);
}

function triggerDownload(
  endpoint: string,
  year: number,
  format: ReportFormat,
  filename: string,
): Promise<void> {
  return downloadFile(endpoint, filename, { params: { year, format } });
}

export async function downloadIncomeExpenseReport(year: number, format: ReportFormat): Promise<void> {
  await triggerDownload('/reports/income-expense', year, format, `income-expense-${year}.${format}`);
}

export async function downloadExpenseLogReport(year: number, format: ReportFormat): Promise<void> {
  await triggerDownload('/reports/expense-log', year, format, `expense-log-${year}.${format}`);
}
