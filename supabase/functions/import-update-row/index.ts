/**
 * import-update-row — Toggle row skip/include or re-validate a single row.
 * POST { batchId, rowId, validationStatus: 'skipped' | 'valid' }
 * Auth: resolveImportAccess. Batch must be previewed/previewing.
 */

import { resolveImportAccess } from '../_shared/importAccess.ts';
import { isImportBatchStatus, type ImportBatchStatus } from '../_shared/importBatchStatusMachine.ts';
import {
  buildHeaderToTargetMap,
  previewImportRow,
  summarizeImportPreview,
} from '../_shared/importPreviewService.ts';
import { jsonError, jsonSuccess, readJsonBody, requireHttpMethod } from '../_shared/httpResponse.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

const UPDATE_ALLOWED_STATUSES: ReadonlyArray<ImportBatchStatus> = ['previewing', 'previewed'];

serveAuthenticated('import-update-row', async (req) => {
  requireHttpMethod(req, 'POST');

  const access = await resolveImportAccess(req);
  const body = await readJsonBody(req);

  const batchId = typeof body.batchId === 'string' ? body.batchId.trim() : '';
  const rowId = typeof body.rowId === 'string' ? body.rowId.trim() : '';
  const validationStatus =
    body.validationStatus === 'skipped' || body.validationStatus === 'valid'
      ? body.validationStatus
      : null;

  if (!batchId) return jsonError(req, 'batchId is required');
  if (!rowId) return jsonError(req, 'rowId is required');
  if (!validationStatus) {
    return jsonError(req, "validationStatus must be 'skipped' or 'valid'");
  }

  const supabase = createServiceClient();

  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .select('id, organization_id, property_id, status, column_mapping')
    .eq('id', batchId)
    .maybeSingle();

  if (batchError) {
    console.error('[import-update-row] batch load failed:', batchError.message);
    return jsonError(req, 'Failed to load import batch');
  }
  if (!batch) return jsonError(req, 'Import batch not found', 404);
  if (batch.organization_id !== access.orgId || batch.property_id !== access.propertyId) {
    return jsonError(req, 'Import batch not found', 404);
  }

  const status = String(batch.status ?? '');
  if (!isImportBatchStatus(status)) return jsonError(req, 'Import batch has an invalid status');
  if (!UPDATE_ALLOWED_STATUSES.includes(status as ImportBatchStatus)) {
    return jsonError(req, `Cannot update rows while batch status is ${status}`);
  }

  const { data: row, error: rowError } = await supabase
    .from('import_batch_rows')
    .select('id, row_index, raw_data, validation_status')
    .eq('id', rowId)
    .eq('batch_id', batchId)
    .maybeSingle();

  if (rowError) {
    console.error('[import-update-row] row load failed:', rowError.message);
    return jsonError(req, 'Failed to load import row');
  }
  if (!row) return jsonError(req, 'Import row not found', 404);

  let nextStatus: 'valid' | 'error' | 'skipped' = validationStatus;
  let validationErrors: Array<Record<string, unknown>> = [];
  let mappedData: Record<string, string | null> = {};

  const headerToTarget = buildHeaderToTargetMap(batch.column_mapping);

  if (validationStatus === 'skipped') {
    mappedData = previewImportRow(
      {
        id: row.id,
        row_index: row.row_index,
        raw_data: row.raw_data as Record<string, string>,
        validation_status: 'skipped',
      },
      headerToTarget,
      batch.property_id,
      null,
      null,
      false
    ).mapped_data;
  } else {
    const { data: property } = await supabase
      .from('properties')
      .select('name, tower_and_unit')
      .eq('id', batch.property_id)
      .maybeSingle();

    const preview = previewImportRow(
      {
        id: row.id,
        row_index: row.row_index,
        raw_data: row.raw_data as Record<string, string>,
        validation_status: 'valid',
      },
      headerToTarget,
      batch.property_id,
      typeof property?.tower_and_unit === 'string' ? property.tower_and_unit : null,
      typeof property?.name === 'string' ? property.name : null,
      false
    );
    nextStatus = preview.validation_status;
    validationErrors = preview.validation_errors;
    mappedData = preview.mapped_data;
  }

  const { error: updateError } = await supabase
    .from('import_batch_rows')
    .update({
      mapped_data: mappedData,
      resolved_property_id: batch.property_id,
      validation_status: nextStatus,
      validation_errors: validationStatus === 'skipped' ? [] : validationErrors,
    })
    .eq('id', rowId)
    .eq('batch_id', batchId);

  if (updateError) {
    console.error('[import-update-row] update failed:', updateError.message);
    return jsonError(req, 'Failed to update import row');
  }

  const { data: allRows } = await supabase
    .from('import_batch_rows')
    .select('validation_status, validation_errors')
    .eq('batch_id', batchId);

  const summary = summarizeImportPreview(
    (allRows ?? []).map((entry, index) => ({
      id: String(index),
      row_index: index,
      mapped_data: {},
      resolved_property_id: batch.property_id,
      validation_status: (entry.validation_status ?? 'valid') as 'valid' | 'error' | 'skipped',
      validation_errors: (Array.isArray(entry.validation_errors)
        ? entry.validation_errors
        : []) as Array<{ severity: 'error' | 'warning' }>,
    }))
  );

  return jsonSuccess(req, {
    batchId,
    rowId,
    validationStatus: nextStatus,
    validationErrors: validationStatus === 'skipped' ? [] : validationErrors,
    summary,
  });
});
