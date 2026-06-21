-- Fix hourly balance-receipt template (20260717120000 mistakenly set it to "Uploaded")
-- and allow instant-upload dedupe in telegram_admin_notification_log.

UPDATE public.telegram_admin_settings
SET
  balance_receipt_template = E'💳 Balance Receipt Needed

Guest: {{primary_guest_name}}
Balance due: {{total_guest_balance}}

Upload payment receipt now:
{{booking_link}}',
  updated_at = NOW()
WHERE id = 1
  AND (
    balance_receipt_template ILIKE '%Balance Receipt Uploaded%'
    OR balance_receipt_template LIKE '%{{balance_receipt_ai_verdict}}%'
  );

ALTER TABLE public.telegram_admin_notification_log
  DROP CONSTRAINT IF EXISTS telegram_admin_notification_log_notification_type_check;

ALTER TABLE public.telegram_admin_notification_log
  ADD CONSTRAINT telegram_admin_notification_log_notification_type_check
  CHECK (
    notification_type IN (
      'new_booking',
      'pending_docs',
      'balance_receipt',
      'balance_receipt_uploaded',
      'sd_refund_pending'
    )
  );

COMMENT ON COLUMN public.telegram_admin_notification_log.hour_bucket IS
  'Manila hour bucket for hourly alerts (e.g. 2026-06-21T15). For balance_receipt_uploaded, storage path / receipt URL suffix.';
