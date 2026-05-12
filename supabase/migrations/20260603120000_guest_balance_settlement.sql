-- Captured when advancing READY_FOR_CHECKIN → PENDING_SD_REFUND_DETAILS (admin or sd-refund-cron).

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS guest_balance_paid_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS guest_balance_payment_receipt_url TEXT;

COMMENT ON COLUMN guest_submissions.guest_balance_paid_amount IS
  'Amount guest paid toward remaining balance (must be ≤ balance). Used with receipt before SD refund form step.';

COMMENT ON COLUMN guest_submissions.guest_balance_payment_receipt_url IS
  'Receipt for final balance payment (READY_FOR_CHECKIN), stored in sd-refund-receipts bucket.';
