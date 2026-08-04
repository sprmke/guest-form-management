/**
 * import-parse-file — Upload CSV, store privately, parse rows into import_batches staging.
 * Auth: resolveImportAccess (import:manage / org owner-admin layer).
 */

import Papa from 'https://esm.sh/papaparse@5.4.1';
import { resolveImportAccess } from '../_shared/importAccess.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROW_COUNT,
  IMPORT_UPLOAD_BUCKET,
  importStoragePath,
  isAllowedImportCsvFile,
} from '../_shared/importUploadLimits.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(`CSV parse error${first.row != null ? ` on row ${first.row + 1}` : ''}: ${first.message}`);
  }

  const headers = (result.meta.fields ?? []).map((field) => field.trim()).filter(Boolean);
  if (headers.length === 0) {
    throw new Error('CSV must include a header row');
  }

  const rows = (result.data ?? []).filter((row) =>
    Object.values(row).some((value) => String(value ?? '').trim().length > 0)
  );

  return { headers, rows };
}

function sampleRows(rows: Record<string, string>[], limit = 5): Record<string, string>[] {
  return rows.slice(0, limit);
}

serveAuthenticated('import-parse-file', async (req) => {
  requireHttpMethod(req, 'POST');

  const access = await resolveImportAccess(req);
  const supabase = createServiceClient();

  const formData = await req.formData();
  const file = formData.get('file');
  const fileNameRaw = formData.get('fileName');
  const fileName =
    (typeof fileNameRaw === 'string' && fileNameRaw.trim()) ||
    (file instanceof File ? file.name : '');

  if (!(file instanceof File)) {
    return jsonError(req, 'file is required');
  }
  if (!fileName) {
    return jsonError(req, 'fileName is required');
  }
  if (!isAllowedImportCsvFile(file, fileName)) {
    return jsonError(req, 'File must be a CSV (.csv)');
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return jsonError(req, 'File must be 15 MB or smaller');
  }

  const batchId = crypto.randomUUID();
  const storagePath = importStoragePath(access.orgId, batchId, fileName);

  const { error: uploadError } = await supabase.storage
    .from(IMPORT_UPLOAD_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: 'text/csv',
    });

  if (uploadError) {
    console.error('[import-parse-file] storage upload failed:', uploadError.message);
    return jsonError(req, `Upload failed: ${uploadError.message}`);
  }

  let parsed: ParsedCsv;
  try {
    const text = await file.text();
    parsed = parseCsvText(text);
  } catch (error) {
    await supabase.storage.from(IMPORT_UPLOAD_BUCKET).remove([storagePath]);
    return jsonError(req, (error as Error).message);
  }

  if (parsed.rows.length === 0) {
    await supabase.storage.from(IMPORT_UPLOAD_BUCKET).remove([storagePath]);
    return jsonError(req, 'CSV must include at least one data row');
  }
  if (parsed.rows.length > IMPORT_MAX_ROW_COUNT) {
    await supabase.storage.from(IMPORT_UPLOAD_BUCKET).remove([storagePath]);
    return jsonError(req, `CSV exceeds the ${IMPORT_MAX_ROW_COUNT.toLocaleString()} row limit`);
  }

  const { error: batchError } = await supabase.from('import_batches').insert({
    id: batchId,
    organization_id: access.orgId,
    property_id: access.propertyId,
    created_by: access.user.email,
    status: 'uploaded',
    original_file_name: fileName,
    storage_path: storagePath,
    column_headers: parsed.headers,
    row_count: parsed.rows.length,
  });

  if (batchError) {
    console.error('[import-parse-file] batch insert failed:', batchError.message);
    await supabase.storage.from(IMPORT_UPLOAD_BUCKET).remove([storagePath]);
    return jsonError(req, 'Failed to create import batch');
  }

  const rowRecords = parsed.rows.map((rawData, index) => ({
    batch_id: batchId,
    row_index: index,
    raw_data: rawData,
  }));

  const { error: rowsError } = await supabase.from('import_batch_rows').insert(rowRecords);

  if (rowsError) {
    console.error('[import-parse-file] row insert failed:', rowsError.message);
    await supabase.from('import_batches').delete().eq('id', batchId);
    await supabase.storage.from(IMPORT_UPLOAD_BUCKET).remove([storagePath]);
    return jsonError(req, 'Failed to store parsed rows');
  }

  console.log(
    `[import-parse-file] batch ${batchId} — ${parsed.rows.length} rows for property ${access.propertyId}`
  );

  return jsonSuccess(req, {
    batchId,
    headers: parsed.headers,
    sampleRows: sampleRows(parsed.rows),
    rowCount: parsed.rows.length,
  });
});
