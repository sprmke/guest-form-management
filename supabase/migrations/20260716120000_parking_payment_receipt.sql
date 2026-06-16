-- Parking fee is settled separately from guest balance settlement.
-- Admin Parking Request form records whether the fee was bundled in the
-- downpayment receipt or paid via a separate parking payment receipt.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS parking_fee_included_in_downpayment BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parking_payment_receipt_url TEXT;

COMMENT ON COLUMN guest_submissions.parking_fee_included_in_downpayment IS
  'When true (default), parking fee was included in the guest downpayment receipt; when false, parking_payment_receipt_url is required before marking parking complete.';

COMMENT ON COLUMN guest_submissions.parking_payment_receipt_url IS
  'Public URL of separate parking payment receipt (bucket: payment-receipts). Required when parking_fee_included_in_downpayment is false.';
