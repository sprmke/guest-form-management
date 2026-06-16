-- AI validation results for separate parking payment receipt uploads.

ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS parking_receipt_ai_verdict TEXT,
  ADD COLUMN IF NOT EXISTS parking_receipt_ai_summary TEXT;

COMMENT ON COLUMN public.guest_submissions.parking_receipt_ai_verdict IS
  'AI verdict for parking payment receipt when parking_fee_included_in_downpayment is false';
COMMENT ON COLUMN public.guest_submissions.parking_receipt_ai_summary IS
  'Short AI explanation for parking payment receipt validation';
