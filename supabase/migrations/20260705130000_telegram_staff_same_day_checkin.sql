-- Staff instant alert when a same-day check-in booking is received after the daily summary time (Manila).

ALTER TABLE public.telegram_staff_settings
  ADD COLUMN IF NOT EXISTS notify_on_same_day_checkin BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.telegram_staff_settings
  ADD COLUMN IF NOT EXISTS same_day_checkin_template TEXT NOT NULL DEFAULT E'🚨 Same-Day Check-In Alert

Guest: {{primary_guest_name}}
Phone: {{guest_phone}}

Check-in: {{check_in_date}} at {{check_in_time}}
Check-out: {{check_out_date}} at {{check_out_time}}
{{nights}} night/s · {{pax}} pax

Has decor: {{decor_status}}
Has pets: {{pet_status}}
Special requests: {{special_requests}}
Balance due: {{total_guest_balance}}';

CREATE TABLE IF NOT EXISTS public.telegram_staff_notification_log (
  id BIGSERIAL PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.guest_submissions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('same_day_checkin')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_telegram_staff_notification_log_sent_at
  ON public.telegram_staff_notification_log (sent_at DESC);

ALTER TABLE public.telegram_staff_notification_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_staff_notification_log IS
  'One-time idempotency log for instant staff Telegram alerts.';

GRANT SELECT, INSERT, DELETE ON public.telegram_staff_notification_log TO service_role;
