-- Restore PENDING_DOCUMENTS on guest_submissions.status CHECK.
-- 20260428120000_add_pending_documents_parent_status.sql added it; a later
-- migration (20260503000000_add_sd_refund_details_status.sql) redefined the
-- CHECK without PENDING_DOCUMENTS, breaking transition-booking → PENDING_DOCUMENTS.

BEGIN;

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_status_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_status_check
  CHECK (status IN (
    'PENDING_REVIEW',
    'PENDING_DOCUMENTS',
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
    'READY_FOR_CHECKIN',
    'PENDING_SD_REFUND_DETAILS',
    'PENDING_SD_REFUND',
    'COMPLETED',
    'CANCELLED'
  ));

COMMENT ON COLUMN guest_submissions.status IS
  'Workflow status. Values: PENDING_REVIEW | PENDING_DOCUMENTS | PENDING_GAF | '
  'PENDING_PARKING_REQUEST | PENDING_PET_REQUEST | READY_FOR_CHECKIN | '
  'PENDING_SD_REFUND_DETAILS | PENDING_SD_REFUND | COMPLETED | CANCELLED. '
  'Driven exclusively by workflowOrchestrator.';

COMMIT;
