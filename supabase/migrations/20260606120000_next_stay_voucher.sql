-- Next-stay Facebook-review voucher.
-- Captured on /sd-form step 1 after the guest opens the Facebook review link
-- and reveals a voucher (random within an allow-list, currently KAME-250 / 300 / 350).
-- Persisted via the public `claim-sd-voucher` edge function while the booking is
-- READY_FOR_CHECKOUT, then surfaced on the admin Pricing card once the booking
-- reaches COMPLETED so admins can validate at the next stay.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS next_stay_voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS next_stay_voucher_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS next_stay_voucher_awarded_at TIMESTAMPTZ;

COMMENT ON COLUMN guest_submissions.next_stay_voucher_code IS
  'Voucher code awarded after the guest tapped "Review us on Facebook" and revealed a voucher (e.g. KAME-300). Idempotent: once set, /sd-form replays the existing voucher instead of re-rolling.';

COMMENT ON COLUMN guest_submissions.next_stay_voucher_amount IS
  'Peso value of next_stay_voucher_code (e.g. 300.00). Stored explicitly so admin reporting/aggregation does not need to parse the code.';

COMMENT ON COLUMN guest_submissions.next_stay_voucher_awarded_at IS
  'Timestamp when next_stay_voucher_code was first persisted.';
