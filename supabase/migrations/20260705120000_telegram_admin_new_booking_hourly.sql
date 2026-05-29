-- Allow hourly dedupe for new-booking reminders while status stays PENDING_REVIEW.

ALTER TABLE public.telegram_admin_notification_log
  DROP CONSTRAINT IF EXISTS telegram_admin_notification_log_notification_type_check;

ALTER TABLE public.telegram_admin_notification_log
  ADD CONSTRAINT telegram_admin_notification_log_notification_type_check
  CHECK (
    notification_type IN (
      'new_booking',
      'pending_docs',
      'balance_receipt',
      'sd_refund_pending'
    )
  );
