-- Finance operating Telegram due-date reminders (per line item + global settings).

CREATE TABLE IF NOT EXISTS public.telegram_finance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_reminder_template TEXT NOT NULL,
  daily_check_time_manila JSONB NOT NULL DEFAULT '{"hour": 9, "minute": 0}'::jsonb
);

ALTER TABLE public.telegram_finance_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_finance_settings IS
  'Single-row finance Telegram reminder config. Due-date alerts for finance_line_items.';

INSERT INTO public.telegram_finance_settings (
  id,
  default_reminder_template
) VALUES (
  1,
  E'💰 Finance reminder\n\n{{label}}\nDue: {{due_date}} ({{days_until_due}} day(s) left)\nAmount: {{amount}}\nCategory: {{category}}\n\n{{notes}}'
)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_finance_settings TO service_role;

ALTER TABLE public.finance_line_items
  ADD COLUMN IF NOT EXISTS telegram_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_due_date DATE,
  ADD COLUMN IF NOT EXISTS telegram_days_before INTEGER NOT NULL DEFAULT 3
    CHECK (telegram_days_before >= 0 AND telegram_days_before <= 90),
  ADD COLUMN IF NOT EXISTS telegram_reminder_interval TEXT NOT NULL DEFAULT 'daily'
    CHECK (telegram_reminder_interval IN ('once', 'daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS telegram_message_template TEXT;

COMMENT ON COLUMN public.finance_line_items.telegram_due_date IS
  'Reminder due date; NULL uses occurred_on for that row.';
COMMENT ON COLUMN public.finance_line_items.telegram_days_before IS
  'Start sending this many Manila calendar days before the due date.';
COMMENT ON COLUMN public.finance_line_items.telegram_reminder_interval IS
  'once | daily | weekly while inside the reminder window.';

CREATE TABLE IF NOT EXISTS public.finance_telegram_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id UUID NOT NULL REFERENCES public.finance_line_items(id) ON DELETE CASCADE,
  sent_on_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (line_item_id, sent_on_date)
);

CREATE INDEX IF NOT EXISTS idx_finance_telegram_reminder_log_line_item
  ON public.finance_telegram_reminder_log (line_item_id);

ALTER TABLE public.finance_telegram_reminder_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_telegram_reminder_log TO service_role;

CREATE OR REPLACE FUNCTION public.sync_telegram_finance_daily_cron_job(p_slot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, vault, pg_temp
AS $fn$
DECLARE
  r RECORD;
  v_hour int;
  v_minute int;
  utc_total int;
  utc_h int;
  utc_m int;
  cron_expr text;
  v_cmd_body text := $BODY$
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
         || '/functions/v1/telegram-finance-cron',
  headers := (
    CASE
      WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets ds WHERE ds.name = 'telegram_finance_cron_secret')
      THEN jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'X-Telegram-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'telegram_finance_cron_secret')
      )
      ELSE jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
      )
    END
  ),
  body := '{}'::jsonb
);
$BODY$;
BEGIN
  IF p_slot IS NULL OR jsonb_typeof(p_slot) <> 'object' THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'p_slot must be a JSON object with hour and minute');
  END IF;

  v_hour := (p_slot ->> 'hour')::int;
  v_minute := (p_slot ->> 'minute')::int;

  IF v_hour IS NULL OR v_hour < 0 OR v_hour > 23 OR v_minute IS NULL OR v_minute < 0 OR v_minute > 59 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'need hour 0-23 and minute 0-59');
  END IF;

  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname = 'telegram-finance-daily'
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  utc_total := (v_hour * 60 + v_minute - 480 + 2880) % 1440;
  utc_h := utc_total / 60;
  utc_m := utc_total % 60;
  cron_expr := utc_m::text || ' ' || utc_h::text || ' * * *';

  PERFORM cron.schedule('telegram-finance-daily', cron_expr, v_cmd_body);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'cronExpr', cron_expr,
    'manilaHour', v_hour,
    'manilaMinute', v_minute
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'sync_telegram_finance_daily_cron_job failed: ' || sqlerrm
    );
END;
$fn$;

COMMENT ON FUNCTION public.sync_telegram_finance_daily_cron_job(jsonb) IS
  'Rebuilds telegram-finance-daily cron job from Manila clock slot. SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.sync_telegram_finance_daily_cron_job(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_telegram_finance_daily_cron_job(jsonb) TO service_role;
