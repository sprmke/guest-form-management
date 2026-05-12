-- Phase 0 — is_test_booking additive flag.
-- Does NOT replace the existing [TEST] / TEST_ prefix behavior; it is a belt-and-suspenders
-- filter so the admin dashboard, cleanup job, and new flow code can find test rows easily.
-- See docs/NEW_FLOW_PLAN.md §2 and §6.1 Q3.4.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS is_test_booking BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN guest_submissions.is_test_booking IS
  'True when the booking was created via the admin "Test Submit" button (or future tooling). Pre-existing rows default to false. Prefix behavior ([TEST] / TEST_) remains unchanged; this column is additive.';

-- Partial index so filters like `WHERE is_test_booking = false` stay cheap as test data accumulates.
CREATE INDEX IF NOT EXISTS idx_guest_submissions_is_test_booking
  ON guest_submissions(is_test_booking)
  WHERE is_test_booking = TRUE;
