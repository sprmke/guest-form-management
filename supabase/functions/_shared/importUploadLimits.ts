/** CSV import upload limits — keep in sync with ui/.../import/lib/importUploadLimits.ts */

export const IMPORT_UPLOAD_BUCKET = 'import-uploads';

export const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;

export const IMPORT_MAX_ROW_COUNT = 2000;

/** PostgREST insert batch size for import_batch_rows (wide JSONB payloads). */
export const IMPORT_ROW_INSERT_CHUNK_SIZE = 500;

export const IMPORT_ALLOWED_MIME_TYPES = new Set(['text/csv', 'application/csv', 'text/plain']);

export function importStoragePath(orgId: string, batchId: string, fileName: string): string {
  const safeName = sanitizeImportFileName(fileName);
  return `${orgId}/${batchId}/${safeName}`;
}

export function sanitizeImportFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || 'import.csv';
  const cleaned = base.replace(/[^\w.\-()+\s]/g, '_').slice(0, 180);
  return cleaned.toLowerCase().endsWith('.csv') ? cleaned : `${cleaned}.csv`;
}

export function isAllowedImportCsvFile(file: File, fileName: string): boolean {
  const mime = (file.type || '').toLowerCase();
  if (IMPORT_ALLOWED_MIME_TYPES.has(mime)) return true;
  return fileName.toLowerCase().endsWith('.csv');
}
