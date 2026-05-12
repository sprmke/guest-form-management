-- Run after importing production `public` data into a local DB that already applied
-- `20260502000000_widen_status_enum.sql`. Production may still use legacy status
-- literals (`booked`, `canceled`); this mirrors that migration’s backfill + CHECK.
-- Keep in sync with supabase/migrations/20260502000000_widen_status_enum.sql.

BEGIN;

UPDATE guest_submissions
SET
  status = 'CANCELLED',
  status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW())
WHERE status = 'canceled';

UPDATE guest_submissions
SET
  status = 'COMPLETED',
  status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW()),
  settled_at = COALESCE(settled_at, updated_at, created_at, NOW())
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
SET
  status = 'PENDING_REVIEW',
  status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW())
WHERE status = 'booked';

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_status_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_status_check
  CHECK (status IN (
    'PENDING_REVIEW',
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
    'READY_FOR_CHECKIN',
    'PENDING_SD_REFUND',
    'COMPLETED',
    'CANCELLED'
  ));

ALTER TABLE guest_submissions
  ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW';

COMMENT ON COLUMN guest_submissions.status IS
  'Workflow status per docs/NEW_FLOW_PLAN.md state machine. '
  'Values: PENDING_REVIEW | PENDING_GAF | PENDING_PARKING_REQUEST | '
  'PENDING_PET_REQUEST | READY_FOR_CHECKIN | PENDING_SD_REFUND | '
  'COMPLETED | CANCELLED. Driven exclusively by workflowOrchestrator.';

-- Match 20250213043908_create_guest_submissions_table.sql. Production can contain rows
-- that fail these checks (e.g. check-out before check-in). NOT VALID = existing rows
-- are accepted; new/updated rows must satisfy the CHECK.
ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_dates;
ALTER TABLE guest_submissions
  ADD CONSTRAINT valid_dates CHECK (
    check_in_date ~ '^\d{2}-\d{2}-\d{4}$' AND
    check_out_date ~ '^\d{2}-\d{2}-\d{4}$' AND
    DATE(
      substring(check_out_date, 7, 4) || '-' ||
      substring(check_out_date, 1, 2) || '-' ||
      substring(check_out_date, 4, 2)
    ) >
    DATE(
      substring(check_in_date, 7, 4) || '-' ||
      substring(check_in_date, 1, 2) || '-' ||
      substring(check_in_date, 4, 2)
    )
  ) NOT VALID;

ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_times;
ALTER TABLE guest_submissions
  ADD CONSTRAINT valid_times CHECK (
    check_in_time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$' AND
    check_out_time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$'
  ) NOT VALID;

COMMIT;
