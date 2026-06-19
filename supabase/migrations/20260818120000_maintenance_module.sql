-- Maintenance reminders (property upkeep schedules + Telegram alerts).

CREATE TABLE IF NOT EXISTS public.maintenance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT,
  scheduled_on DATE NOT NULL,
  notes TEXT,
  recurrence_series_id UUID,
  recurrence_interval TEXT
    CHECK (
      recurrence_interval IS NULL
      OR recurrence_interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
    ),
  telegram_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_due_date DATE,
  telegram_days_before INTEGER NOT NULL DEFAULT 3
    CHECK (telegram_days_before >= 0 AND telegram_days_before <= 90),
  telegram_reminder_interval TEXT NOT NULL DEFAULT 'daily_noon'
    CHECK (
      telegram_reminder_interval IN (
        'hourly',
        'every_2_hours',
        'every_4_hours',
        'every_12_hours',
        'daily_noon'
      )
    ),
  telegram_message_template TEXT,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_items_scheduled_on
  ON public.maintenance_items (scheduled_on DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_items_recurrence_series
  ON public.maintenance_items (recurrence_series_id)
  WHERE recurrence_series_id IS NOT NULL;

COMMENT ON TABLE public.maintenance_items IS
  'Property maintenance schedules — admin-only via edge functions.';

ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.telegram_maintenance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_reminder_template TEXT NOT NULL,
  daily_check_time_manila JSONB NOT NULL DEFAULT '{"hour": 9, "minute": 0}'::jsonb
);

ALTER TABLE public.telegram_maintenance_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_maintenance_settings IS
  'Single-row maintenance Telegram reminder config for maintenance_items.';

INSERT INTO public.telegram_maintenance_settings (
  id,
  default_reminder_template
) VALUES (
  1,
  E'🔧 Maintenance reminder\n\n{{label}}\nDue: {{due_date}} ({{days_until_due}} day(s) left)\nCategory: {{category}}\n\n{{notes}}'
)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_maintenance_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.maintenance_telegram_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.maintenance_items(id) ON DELETE CASCADE,
  sent_on_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, sent_on_date)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_telegram_reminder_log_item
  ON public.maintenance_telegram_reminder_log (item_id);

ALTER TABLE public.maintenance_telegram_reminder_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_telegram_reminder_log TO service_role;

CREATE OR REPLACE FUNCTION public.sync_telegram_maintenance_hourly_cron_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, vault, pg_temp
AS $fn$
DECLARE
  r RECORD;
  cron_expr text := '0 * * * *';
  v_cmd_body text := $BODY$
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
         || '/functions/v1/telegram-maintenance-cron',
  headers := (
    CASE
      WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets ds WHERE ds.name = 'telegram_maintenance_cron_secret')
      THEN jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'X-Telegram-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'telegram_maintenance_cron_secret')
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
  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname = 'telegram-maintenance-hourly'
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  PERFORM cron.schedule('telegram-maintenance-hourly', cron_expr, v_cmd_body);

  RETURN jsonb_build_object('ok', TRUE, 'cronExpr', cron_expr);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'sync_telegram_maintenance_hourly_cron_job failed: ' || sqlerrm
    );
END;
$fn$;

COMMENT ON FUNCTION public.sync_telegram_maintenance_hourly_cron_job() IS
  'Rebuilds telegram-maintenance-hourly cron job (hourly). SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.sync_telegram_maintenance_hourly_cron_job() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_telegram_maintenance_hourly_cron_job() TO service_role;
