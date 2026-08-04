/** CSV import upload limits — mirror of supabase/functions/_shared/importUploadLimits.ts */

export const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;

export const IMPORT_MAX_ROW_COUNT = 2000;

export const IMPORT_ACCEPT = '.csv,text/csv';

export const IMPORT_LIMITS_HINT = `CSV only · max 15 MB · up to ${IMPORT_MAX_ROW_COUNT.toLocaleString()} rows`;

export function validateImportCsvFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const csvMime = mime === 'text/csv' || mime === 'application/csv' || mime === 'text/plain' || mime === '';
  if (!name.endsWith('.csv') && !csvMime) {
    return 'File must be a CSV (.csv)';
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return 'File must be 15 MB or smaller';
  }
  return null;
}
