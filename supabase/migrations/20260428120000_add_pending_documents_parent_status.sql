-- Add parent booking status PENDING_DOCUMENTS and completion markers
-- for its parallel sub-statuses (GAF / parking / pet).

BEGIN;

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS gaf_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parking_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pet_completed_at TIMESTAMPTZ;

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_status_check;

-- Normalize legacy statuses before attaching CHECK (Q1.1 date rules mirror
-- `20260502000000_widen_status_enum.sql`). Do not touch `status_updated_at` or
-- `settled_at` — both are added later in `20260501000002_add_workflow_columns.sql`.

UPDATE guest_submissions
SET status = 'CANCELLED'
WHERE status = 'canceled';

UPDATE guest_submissions
SET status = 'COMPLETED'
WHERE status = 'booked'
  AND (
    (
      check_in_date ~ '^\d{4}-\d{2}-\d{2}$'
      AND check_in_date::DATE < (NOW() AT TIME ZONE 'Asia/Manila')::DATE
    )
    OR (
      check_in_date ~ '^\d{2}-\d{2}-\d{4}$'
      AND TO_DATE(check_in_date, 'MM-DD-YYYY') < (NOW() AT TIME ZONE 'Asia/Manila')::DATE
    )
  );

UPDATE guest_submissions
SET status = 'PENDING_REVIEW'
WHERE status = 'booked';

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

COMMENT ON COLUMN guest_submissions.gaf_completed_at IS
  'Timestamp when Pending GAF sub-status is marked complete under PENDING_DOCUMENTS.';
COMMENT ON COLUMN guest_submissions.parking_completed_at IS
  'Timestamp when Pending Parking Request sub-status is marked complete under PENDING_DOCUMENTS.';
COMMENT ON COLUMN guest_submissions.pet_completed_at IS
  'Timestamp when Pending Pet Request sub-status is marked complete under PENDING_DOCUMENTS.';

COMMIT;
