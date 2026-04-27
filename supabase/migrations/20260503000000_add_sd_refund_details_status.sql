-- Phase 7 — PENDING_SD_REFUND_DETAILS + guest SD refund form columns.
-- Inserts new workflow status between READY_FOR_CHECKIN and PENDING_SD_REFUND.
-- See docs/NEW_FLOW_PLAN.md (post-merge) and booking-workflow.mdc.

BEGIN;

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
    'PENDING_SD_REFUND_DETAILS',
    'PENDING_SD_REFUND',
    'COMPLETED',
    'CANCELLED'
  ));

COMMENT ON COLUMN guest_submissions.status IS
  'Workflow status. Values: PENDING_REVIEW | PENDING_GAF | PENDING_PARKING_REQUEST | '
  'PENDING_PET_REQUEST | READY_FOR_CHECKIN | PENDING_SD_REFUND_DETAILS | PENDING_SD_REFUND | '
  'COMPLETED | CANCELLED. Driven exclusively by workflowOrchestrator.';

-- Guest SD form (after checkout + cron → PENDING_SD_REFUND_DETAILS)
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS sd_refund_guest_feedback TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_method TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_phone_confirmed BOOLEAN,
  ADD COLUMN IF NOT EXISTS sd_refund_bank TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_account_name TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_account_number TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_cash_pickup_note TEXT,
  ADD COLUMN IF NOT EXISTS sd_refund_form_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sd_refund_form_emailed_at TIMESTAMPTZ;

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_sd_refund_method_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_sd_refund_method_check
  CHECK (
    sd_refund_method IS NULL
    OR sd_refund_method IN ('same_phone', 'other_bank', 'cash')
  );

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_sd_refund_bank_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_sd_refund_bank_check
  CHECK (
    sd_refund_bank IS NULL
    OR sd_refund_bank IN ('GCash', 'Maribank', 'BDO', 'BPI')
  );

COMMENT ON COLUMN guest_submissions.sd_refund_guest_feedback IS
  'Free-text from guest step 1 of /sd-form (review / feedback).';
COMMENT ON COLUMN guest_submissions.sd_refund_method IS
  'Guest refund preference: same_phone | other_bank | cash.';
COMMENT ON COLUMN guest_submissions.sd_refund_phone_confirmed IS
  'True when guest chose refund to GCash number on file (same as phone).';
COMMENT ON COLUMN guest_submissions.sd_refund_bank IS
  'When method=other_bank: GCash | Maribank | BDO | BPI.';
COMMENT ON COLUMN guest_submissions.sd_refund_account_name IS
  'Account holder name when method=other_bank.';
COMMENT ON COLUMN guest_submissions.sd_refund_account_number IS
  'Account number when method=other_bank.';
COMMENT ON COLUMN guest_submissions.sd_refund_cash_pickup_note IS
  'Optional note when method=cash.';
COMMENT ON COLUMN guest_submissions.sd_refund_form_submitted_at IS
  'When guest submitted /sd-form (transition to PENDING_SD_REFUND).';
COMMENT ON COLUMN guest_submissions.sd_refund_form_emailed_at IS
  'Last time SD refund form request email was sent to the guest.';

COMMIT;
