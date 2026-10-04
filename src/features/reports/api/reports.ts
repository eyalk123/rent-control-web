// Adapted from rent-control mobile 2026-05-14.
// expo-file-system + expo-sharing replaced with browser Blob URL download.
import i18n from 'i18next';
import { revenueBasisDefault } from '@/shared/utils/capabilities';

import apiClient from '@/core/api/client';
import { downloadFile } from '@/shared/utils/download';

export interface ReportExport {
  id: number;
  report_type: 'income_expense' | 'expense_log';
  year: number;
  format: 'pdf' | 'csv';
  /**
   * Which revenue recognition basis produced it. `null` for an expense log (no revenue to
   * recognise) and for anything exported before the choice existed — which was accrual by
   * definition. Shown on the history row so two otherwise-identical reports can be told
   * apart.
   */
  revenue_basis: RevenueBasis | null;
  /**
   * The property owners it was limited to, as typed on the properties (`''` is the
   * no-owner group). `null` means every owner.
   */
  owners: string[] | null;
  /** Downloaded as a ZIP holding one file per owner. */
  split_by_owner: boolean;
  created_at: string;
}

export type ReportFormat = 'pdf' | 'csv';

/**
 * Which owners a report covers and how it is packaged. `owners` omitted or `null` means
 * every owner; `split` downloads a ZIP with one file per owner instead of one grouped file.
 */
export interface OwnerExportOptions {
  owners?: string[] | null;
  split?: boolean;
}

/**
 * Accrual counts December's rent as December income even if it arrived in January; cash
 * counts it when it arrived. Chosen **per report**, next to the language, rather than
 * stored on the account: a stored preference would silently re-interpret history, so the
 * same year's report would say two different things depending on when it was generated.
 */
export type RevenueBasis = 'accrual' | 'cash';

export async function getReportHistory(): Promise<ReportExport[]> {
  const response = await apiClient.get<ReportExport[]>('/reports/history');
  return response.data;
}

export async function deleteReportExport(id: number): Promise<void> {
  await apiClient.delete(`/reports/history/${id}`);
}

/** The report is rendered in the language the app is currently in, right-to-left included. */
function reportLang(): 'en' | 'he' {
  return i18n.language?.startsWith('he') ? 'he' : 'en';
}

function triggerDownload(
  endpoint: string,
  year: number,
  format: ReportFormat,
  stem: string,
  { owners, split }: OwnerExportOptions,
  basis?: RevenueBasis,
): Promise<void> {
  // URLSearchParams rather than a plain object: the owner parameter repeats
  // (`owner=Dana&owner=Avi`), which axios would otherwise send as `owner[]=`.
  const params = new URLSearchParams({ year: String(year), format, lang: reportLang() });
  if (basis) params.set('basis', basis);
  owners?.forEach((o) => params.append('owner', o));
  if (split) params.set('split', 'true');
  return downloadFile(endpoint, `${stem}.${split ? 'zip' : format}`, { params });
}

export async function downloadIncomeExpenseReport(
  year: number,
  format: ReportFormat,
  basis: RevenueBasis = 'accrual',
  options: OwnerExportOptions = {},
): Promise<void> {
  await triggerDownload(
    '/reports/income-expense', year, format, `income-expense-${year}`, options, basis,
  );
}

/**
 * No basis parameter: an expense log has no revenue to recognise, and expenses already
 * count on the date they were paid under both bases.
 */
export async function downloadExpenseLogReport(
  year: number,
  format: ReportFormat,
  options: OwnerExportOptions = {},
): Promise<void> {
  await triggerDownload('/reports/expense-log', year, format, `expense-log-${year}`, options);
}

/** The option a country's landlords most likely want — pre-selected, never forced. */
export function defaultRevenueBasis(): RevenueBasis {
  return revenueBasisDefault();
}
