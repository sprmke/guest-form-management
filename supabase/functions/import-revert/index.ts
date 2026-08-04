/**
 * import-revert — Cancel imported guest_submissions by reverting a committed batch.
 *
 * POST { batchId, includeMoved?: boolean }
 * Auth: resolveImportAccess.
 *
 * Default: cancels rows still at IMPORTED status; rows moved to other statuses
 * (admin pulled them into the live workflow) are skipped and returned in `moved[]`.
 * Pass `includeMoved: true` to also cancel those rows.
 *
 * Transitions use WorkflowOrchestrator with manual=true and calendar/sheets
 * disabled — IMPORTED bookings have no calendar events (bypassed at commit time).
 */

import { resolveImportAccess } from '../_shared/importAccess.ts';
import {
  isImportBatchStatus,
  type ImportBatchStatus,
} from '../_shared/importBatchStatusMachine.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import { jsonError, jsonSuccess, readJsonBody, requireHttpMethod } from '../_shared/httpResponse.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

const REVERT_ALLOWED_STATUSES: ReadonlyArray<ImportBatchStatus> = ['committed'];

type MovedRow = {
  bookingId: string;
  status: string;
  modifiedSinceImport: boolean;
};

type RevertFailure = {
  bookingId: string;
  reason: string;
};

serveAuthenticated('import-revert', async (req) => {
  requireHttpMethod(req, 'POST');

  const access = await resolveImportAccess(req);
  const body = await readJsonBody(req);

  const batchId = typeof body.batchId === 'string' ? body.batchId.trim() : '';
  if (!batchId) return jsonError(req, 'batchId is required');

  const includeMoved = body.includeMoved === true;

  const supabase = createServiceClient();

  // Load and validate batch.
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .select('id, organization_id, property_id, status, committed_at')
    .eq('id', batchId)
    .maybeSingle();

  if (batchError) {
    console.error('[import-revert] batch load failed:', batchError.message);
    return jsonError(req, 'Failed to load import batch');
  }
  if (!batch) return jsonError(req, 'Import batch not found', 404);
  if (batch.organization_id !== access.orgId || batch.property_id !== access.propertyId) {
    return jsonError(req, 'Import batch not found', 404);
  }

  const status = String(batch.status ?? '') as ImportBatchStatus;
  if (!isImportBatchStatus(status)) return jsonError(req, 'Import batch has an invalid status');
  if (!REVERT_ALLOWED_STATUSES.includes(status)) {
    return jsonError(req, `Cannot revert batch with status ${status}`);
  }

  const committedAt = typeof batch.committed_at === 'string' ? batch.committed_at : null;

  // Transition → reverting.
  const { error: revertStartError } = await supabase
    .from('import_batches')
    .update({ status: 'reverting', updated_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('status', 'committed');

  if (revertStartError) {
    console.error('[import-revert] failed to start revert:', revertStartError.message);
    return jsonError(req, 'Failed to start revert');
  }

  // Load all guest_submissions created by this batch.
  const { data: submissions, error: submissionsError } = await supabase
    .from('guest_submissions')
    .select('id, status, updated_at')
    .eq('imported_from_batch_id', batchId);

  if (submissionsError) {
    console.error('[import-revert] submissions load failed:', submissionsError.message);
    await supabase
      .from('import_batches')
      .update({
        status: 'failed',
        error: submissionsError.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);
    return jsonError(req, 'Failed to load committed submissions');
  }

  const allSubmissions = submissions ?? [];

  // Separate IMPORTED rows from rows moved into the live pipeline.
  const importedRows = allSubmissions.filter((s) => s.status === 'IMPORTED');
  const movedRows = allSubmissions.filter((s) => s.status !== 'IMPORTED');

  // Surface modified-since-import flag: a submission updated after commit is a
  // signal that an admin manually edited it (e.g. fixed a date or pricing field).
  const movedDetails: MovedRow[] = movedRows.map((s) => ({
    bookingId: s.id,
    status: s.status,
    modifiedSinceImport:
      committedAt != null &&
      typeof s.updated_at === 'string' &&
      s.updated_at > committedAt,
  }));

  const toCancel = includeMoved ? allSubmissions : importedRows;

  // DevControlFlags that disable side effects irrelevant to IMPORTED bookings:
  // – no calendar events were created at commit time, so no update needed on cancel;
  // – no Google Sheets rows to remove;
  // – no emails were sent on import, so no cancellation notification needed.
  const devControls = {
    updateGoogleCalendar: false,
    updateGoogleSheets: false,
  };

  let cancelled = 0;
  const revertFailed: RevertFailure[] = [];

  for (const submission of toCancel) {
    try {
      // Use WorkflowOrchestrator with manual=true — same path admin manual cancel uses.
      // IMPORTED → CANCELLED is in the manual-override graph (statusMachine.ts).
      await WorkflowOrchestrator.transition(
        submission.id,
        'CANCELLED',
        {},
        devControls,
        true // manual override
      );
      cancelled += 1;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[import-revert] booking ${submission.id} cancel failed:`, reason);
      revertFailed.push({ bookingId: submission.id, reason });
    }
  }

  const now = new Date().toISOString();

  // Finalize batch → reverted.
  const { error: finalizeError } = await supabase
    .from('import_batches')
    .update({
      status: 'reverted',
      reverted_at: now,
      updated_at: now,
    })
    .eq('id', batchId);

  if (finalizeError) {
    console.error('[import-revert] batch finalize failed:', finalizeError.message);
    // Non-fatal: the submissions were cancelled; mark status best-effort.
  }

  console.log(
    `[import-revert] batch ${batchId} — cancelled=${cancelled}, moved=${movedDetails.length}, failed=${revertFailed.length}`
  );

  return jsonSuccess(req, {
    batchId,
    status: 'reverted',
    cancelled,
    // Rows that were moved out of IMPORTED before revert ran (not cancelled unless includeMoved=true).
    moved: includeMoved ? [] : movedDetails,
    failed: revertFailed,
  });
});
