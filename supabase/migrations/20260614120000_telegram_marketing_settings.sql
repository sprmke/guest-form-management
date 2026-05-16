-- Telegram marketing reminders: configurable templates (Settings UI) + Edge/cron sends.
-- Access only via Edge Functions (service role); no public policies.

CREATE TABLE IF NOT EXISTS public.telegram_marketing_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_new_booking BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_cancellation BOOLEAN NOT NULL DEFAULT TRUE,
  urgency_days_threshold INTEGER NOT NULL DEFAULT 5 CHECK (urgency_days_threshold >= 1 AND urgency_days_threshold <= 30),
  new_booking_dates_limit INTEGER NOT NULL DEFAULT 8 CHECK (new_booking_dates_limit >= 1 AND new_booking_dates_limit <= 31),
  daily_default_template TEXT NOT NULL,
  daily_urgency_template TEXT NOT NULL,
  new_booking_template TEXT NOT NULL,
  cancellation_template TEXT NOT NULL
);

ALTER TABLE public.telegram_marketing_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_marketing_settings IS
  'Single-row marketing copy for Telegram. Placeholders: {{available_dates}}, {{month_name}}, {{dates_list}}, {{cancellation_dates}}.';

INSERT INTO public.telegram_marketing_settings (
  id,
  daily_default_template,
  daily_urgency_template,
  new_booking_template,
  cancellation_template
) VALUES (
  1,
  'Pa up and share po ka-uppers! Salamuch!',
  'Available this {{available_dates}}. Book now and get huge last minute discount!',
  'Available next dates: {{month_name}} {{dates_list}}. Book now and get huge discount for this month!',
  'Available this {{cancellation_dates}} due to guest cancellation! Book now and get huge discount for this specific date/s!'
)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_marketing_settings TO service_role;
