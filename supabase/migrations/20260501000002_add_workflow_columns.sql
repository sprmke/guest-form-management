-- Phase 0 — Additive workflow columns for the new booking lifecycle.
-- All columns are nullable (or default false/NULL-safe arrays) so existing rows are untouched.
-- Behavior change is deferred to later phases; see docs/NEW_FLOW_PLAN.md §2 and §5 (Phase 0).
-- Money fields are NUMERIC(12,2) per §6.1 Q1.4 (peso amounts, two decimals, no cents migration needed).

-- Pricing + payment fields (entered at PENDING_REVIEW review step).
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS booking_rate      NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS down_payment      NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS balance           NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS security_deposit  NUMERIC(12, 2);

COMMENT ON COLUMN guest_submissions.booking_rate     IS 'Full booking rate entered during PENDING_REVIEW.';
COMMENT ON COLUMN guest_submissions.down_payment     IS 'Down payment entered during PENDING_REVIEW.';
COMMENT ON COLUMN guest_submissions.balance          IS 'Auto-computed: booking_rate - down_payment. Does NOT include parking/pet/SD.';
COMMENT ON COLUMN guest_submissions.security_deposit IS 'Security deposit. Separate from balance; default guidance PHP 1500 (see NEW_FLOW_PLAN §6.1 Q2.1).';

-- Parking fields (shown during PENDING_PARKING_REQUEST).
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS parking_rate_guest      NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS parking_rate_paid       NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS parking_endorsement_url TEXT,
  ADD COLUMN IF NOT EXISTS parking_owner_email     TEXT;

COMMENT ON COLUMN guest_submissions.parking_rate_guest      IS 'Amount charged to the guest for parking (UI label: "Guest Parking Rate").';
COMMENT ON COLUMN guest_submissions.parking_rate_paid       IS 'Amount paid out to the selected parking owner (UI label: "Paid Parking Rate").';
COMMENT ON COLUMN guest_submissions.parking_endorsement_url IS 'Public URL of uploaded parking endorsement screenshot (bucket: parking-endorsements).';
COMMENT ON COLUMN guest_submissions.parking_owner_email     IS 'Selected parking owner email (from PARKING_OWNER_EMAILS broadcast replies).';

-- Pet fee (shown when has_pets = true).
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS pet_fee NUMERIC(12, 2);

COMMENT ON COLUMN guest_submissions.pet_fee IS 'Pet fee line item (separate from balance).';

-- PENDING_SD_REFUND stage fields.
-- Arrays store one NUMERIC per "+" row in the SD refund form (one value per addition in the admin UI).
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS sd_additional_expenses NUMERIC(12, 2)[] NOT NULL DEFAULT ARRAY[]::NUMERIC(12, 2)[],
  ADD COLUMN IF NOT EXISTS sd_additional_profits  NUMERIC(12, 2)[] NOT NULL DEFAULT ARRAY[]::NUMERIC(12, 2)[],
  ADD COLUMN IF NOT EXISTS sd_refund_amount       NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS sd_refund_receipt_url  TEXT;

COMMENT ON COLUMN guest_submissions.sd_additional_expenses IS 'Array of additional expense amounts collected in the PENDING_SD_REFUND stage. One entry per "+ Expense" row.';
COMMENT ON COLUMN guest_submissions.sd_additional_profits  IS 'Array of additional profit amounts collected in the PENDING_SD_REFUND stage. One entry per "+ Profit" row.';
COMMENT ON COLUMN guest_submissions.sd_refund_amount       IS 'Final SD refund amount settled in PENDING_SD_REFUND.';
COMMENT ON COLUMN guest_submissions.sd_refund_receipt_url  IS 'URL of uploaded SD refund receipt (bucket: sd-refund-receipts).';

-- Status + lifecycle timestamps.
-- status_updated_at is written by transition-booking / workflowOrchestrator. Not backfilled in Phase 0.
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_at        TIMESTAMPTZ;

COMMENT ON COLUMN guest_submissions.status_updated_at IS 'Timestamp of the last status transition. Driven by workflowOrchestrator only.';
COMMENT ON COLUMN guest_submissions.settled_at        IS 'Stamp when booking moves to COMPLETED.';

-- Helpful index for admin list pagination / filtering (cheap to add now, even with mostly NULLs today).
CREATE INDEX IF NOT EXISTS idx_guest_submissions_status_updated_at
  ON guest_submissions(status_updated_at DESC NULLS LAST);
