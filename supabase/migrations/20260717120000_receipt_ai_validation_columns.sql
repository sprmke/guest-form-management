-- AI payment receipt validation results (Gemini Flash vision).

ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS dp_receipt_ai_verdict TEXT,
  ADD COLUMN IF NOT EXISTS dp_receipt_ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS balance_receipt_ai_verdict TEXT,
  ADD COLUMN IF NOT EXISTS balance_receipt_ai_summary TEXT;

COMMENT ON COLUMN public.guest_submissions.dp_receipt_ai_verdict IS
  'AI verdict for downpayment receipt: valid, likely_valid, unclear, invalid, skipped';
COMMENT ON COLUMN public.guest_submissions.dp_receipt_ai_summary IS
  'Short AI explanation for downpayment receipt validation';
COMMENT ON COLUMN public.guest_submissions.balance_receipt_ai_verdict IS
  'AI verdict for guest balance payment receipt';
COMMENT ON COLUMN public.guest_submissions.balance_receipt_ai_summary IS
  'Short AI explanation for balance payment receipt validation';

-- Update default admin Telegram new-booking template to include downpayment receipt AI check.
UPDATE public.telegram_admin_settings
SET
  new_booking_template = E'🆕 New Booking Request\n{{urgent_notice}}{{tower_and_unit_number}}\n\nStay details\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\nNights: {{nights}}\nPax: {{pax}}\n\nGuest details\nFacebook: {{guest_facebook_name}}\nPrimary guest: {{primary_guest_name}}\nAddress: {{guest_address}}\nPhone: {{guest_phone}}\nEmail: {{guest_email}}\nSource: {{booking_source}}\n\nNotable information\nPay parking: {{need_parking}}\nPet approval: {{has_pets}}\nSurprise decor: {{surprise_decor}}\n\nDownpayment receipt AI\nVerdict: {{dp_receipt_ai_verdict}}\n{{dp_receipt_ai_summary}}\n\n{{booking_link}}',
  balance_receipt_template = E'💳 Balance Receipt Uploaded\n\nGuest: {{primary_guest_name}}\nBalance due: {{total_guest_balance}}\n\nBalance receipt AI\nVerdict: {{balance_receipt_ai_verdict}}\n{{balance_receipt_ai_summary}}\n\n{{booking_link}}',
  updated_at = NOW()
WHERE id = 1;
