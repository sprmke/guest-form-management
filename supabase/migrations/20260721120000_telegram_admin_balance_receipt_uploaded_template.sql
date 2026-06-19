-- Split balance receipt admin Telegram templates: hourly "needed" vs instant "uploaded".

ALTER TABLE public.telegram_admin_settings
  ADD COLUMN IF NOT EXISTS notify_on_balance_receipt_uploaded BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS balance_receipt_uploaded_template TEXT NOT NULL DEFAULT E'💳 Balance Receipt Uploaded

Guest: {{primary_guest_name}}
Balance due: {{total_guest_balance}}

Balance receipt AI
Verdict: {{balance_receipt_ai_verdict}}
{{balance_receipt_ai_summary}}

{{booking_link}}';

COMMENT ON COLUMN public.telegram_admin_settings.notify_on_balance_receipt_uploaded IS
  'Instant alert when admin uploads a guest balance payment receipt.';
COMMENT ON COLUMN public.telegram_admin_settings.balance_receipt_uploaded_template IS
  'Template for instant balance receipt upload alerts (includes AI verdict placeholders).';

-- Hourly reminders use balance_receipt_template ("Needed"); restore after receipt-AI migration overwrote it.
UPDATE public.telegram_admin_settings
SET
  balance_receipt_template = E'💳 Balance Receipt Needed

Guest: {{primary_guest_name}}
Balance due: {{total_guest_balance}}

Upload payment receipt now:
{{booking_link}}',
  updated_at = NOW()
WHERE id = 1;
