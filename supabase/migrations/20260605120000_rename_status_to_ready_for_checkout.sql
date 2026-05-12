-- Rename workflow status PENDING_SD_REFUND_DETAILS → READY_FOR_CHECKOUT ("Ready for check-out" in UI).
-- Updates existing rows and replaces the status CHECK constraint list.
--
-- Order: DROP check → UPDATE → ADD check. Postgres validates the new status value
-- against the existing constraint on UPDATE; READY_FOR_CHECKOUT is not allowed until
-- the old constraint is dropped.

BEGIN;

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_status_check;

UPDATE guest_submissions
SET status = 'READY_FOR_CHECKOUT'
WHERE status = 'PENDING_SD_REFUND_DETAILS';

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_status_check
  CHECK (status IN (
    'PENDING_REVIEW',
    'PENDING_DOCUMENTS',
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
    'READY_FOR_CHECKIN',
    'READY_FOR_CHECKOUT',
    'PENDING_SD_REFUND',
    'COMPLETED',
    'CANCELLED'
  ));

COMMENT ON COLUMN guest_submissions.status IS
  'Workflow status. Values: PENDING_REVIEW | PENDING_DOCUMENTS | PENDING_GAF | '
  'PENDING_PARKING_REQUEST | PENDING_PET_REQUEST | READY_FOR_CHECKIN | '
  'READY_FOR_CHECKOUT | PENDING_SD_REFUND | COMPLETED | CANCELLED. '
  'Driven exclusively by workflowOrchestrator.';

COMMIT;
