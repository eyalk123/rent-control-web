import { USE_MOCK_API, mockExportApi } from '@/core/api/mock';
import { downloadFile } from '@/shared/utils/download';

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Download everything the owner owns: a ZIP holding an .xlsx workbook plus their files.
 *
 *  The server sets its own Content-Disposition filename; the one passed here is what the
 *  browser saves as, so keep the two in the same shape. */
export async function downloadAllData(): Promise<void> {
  const filename = `rent-control-export-${todayStamp()}.zip`;
  if (USE_MOCK_API) return mockExportApi.downloadAllData(filename);
  // Whole-portfolio export incl. file bytes — much heavier than a report, so allow longer.
  await downloadFile('/users/me/export', filename, { timeout: 300000 });
}
