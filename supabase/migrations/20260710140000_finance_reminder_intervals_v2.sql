-- Finance reminder intervals v2: hourly cadences + daily noon + until_paid.

-- Drop old CHECK before rewriting values (v1 allowed once/daily/weekly/until_paid only).
ALTER TABLE public.finance_line_items
  DROP CONSTRAINT IF EXISTS finance_line_items_telegram_reminder_interval_check;

UPDATE public.finance_line_items
SET telegram_reminder_interval = 'daily_noon'
WHERE telegram_reminder_interval IN ('once', 'daily', 'weekly');

ALTER TABLE public.finance_line_items
  ALTER COLUMN telegram_reminder_interval SET DEFAULT 'daily_noon';

ALTER TABLE public.finance_line_items
  ADD CONSTRAINT finance_line_items_telegram_reminder_interval_check
  CHECK (telegram_reminder_interval IN (
    'hourly',
    'every_2_hours',
    'every_4_hours',
    'every_12_hours',
    'daily_noon',
    'until_paid'
  ));

COMMENT ON COLUMN public.finance_line_items.telegram_reminder_interval IS
  'hourly | every_2_hours | every_4_hours | every_12_hours | daily_noon | until_paid (daily until marked paid, including after due date).';

-- Allow multiple sends per Manila day (hourly cadences).
ALTER TABLE public.finance_telegram_reminder_log
  DROP CONSTRAINT IF EXISTS finance_telegram_reminder_log_line_item_id_sent_on_date_key;

CREATE INDEX IF NOT EXISTS idx_finance_telegram_reminder_log_line_sent_at
  ON public.finance_telegram_reminder_log (line_item_id, sent_at DESC);

-- Hourly pg_cron job (replaces daily slot-based schedule).
CREATE OR REPLACE FUNCTION public.sync_telegram_finance_daily_cron_job(p_slot jsonb)
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
  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname IN ('telegram-finance-daily', 'telegram-finance-hourly')
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  PERFORM cron.schedule('telegram-finance-hourly', cron_expr, v_cmd_body);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'cronExpr', cron_expr,
    'schedule', 'hourly'
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
  'Rebuilds telegram-finance-hourly cron job (every hour UTC). p_slot retained for API compat; schedule is fixed hourly.';
