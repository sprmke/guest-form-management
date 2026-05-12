-- Phase 2 — Widen status column to the new booking workflow enum.
-- Backfills legacy 'booked'/'canceled' rows per docs/NEW_FLOW_PLAN.md §6.1 Q1.1:
--   • 'canceled' rows → 'CANCELLED'
--   • 'booked' rows where check_in_date is strictly before today (Asia/Manila) → 'COMPLETED'
--     (check_in_date TEXT may be MM-DD-YYYY or YYYY-MM-DD)
--   • 'booked' rows where check_in_date is today or in the future → 'PENDING_REVIEW'
-- Then adds a CHECK constraint so future inserts must use the canonical enum.
-- Safeguards: DO blocks are idempotent — safe to re-run if partially applied.

BEGIN;

-- ── Step 1: Backfill 'canceled' → 'CANCELLED' ──────────────────────────────
UPDATE guest_submissions
SET
  status = 'CANCELLED',
  status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW())
WHERE status = 'canceled';

-- ── Step 2: Backfill 'booked' → 'COMPLETED' (past check-ins) ───────────────
-- check_in_date is TEXT (canonical MM-DD-YYYY; some rows use YYYY-MM-DD).
-- "before today" uses Asia/Manila wall clock as specified in §6.1 Q1.1.
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

-- ── Step 3: Backfill remaining 'booked' → 'PENDING_REVIEW' (today / future) ─
UPDATE guest_submissions
SET
  status = 'PENDING_REVIEW',
  status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW())
WHERE status = 'booked';

-- ── Step 4: Add CHECK constraint (only new-enum values allowed going forward) ──
-- Drop the constraint first if a previous partial run left it behind.
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

-- ── Step 5: Update DEFAULT so new inserts land in PENDING_REVIEW ─────────────
-- The submit-form edge function will set this explicitly in Phase 5, but the
-- column default should already reflect the new initial status.
ALTER TABLE guest_submissions
  ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW';

-- ── Step 6: Update column comment ──────────────────────────────────────────
COMMENT ON COLUMN guest_submissions.status IS
  'Workflow status per docs/NEW_FLOW_PLAN.md state machine. '
  'Values: PENDING_REVIEW | PENDING_GAF | PENDING_PARKING_REQUEST | '
  'PENDING_PET_REQUEST | READY_FOR_CHECKIN | PENDING_SD_REFUND | '
  'COMPLETED | CANCELLED. Driven exclusively by workflowOrchestrator.';

COMMIT;
