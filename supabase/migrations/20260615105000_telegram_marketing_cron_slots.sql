-- Custom daily reminder slots (Asia/Manila clock) → pg_cron jobs in UTC calling telegram-marketing-cron.
-- Patched via Edge `telegram-marketing-settings` (service_role calls sync RPC).

ALTER TABLE public.telegram_marketing_settings
  ADD COLUMN IF NOT EXISTS daily_reminder_times_manila JSONB NOT NULL DEFAULT '[
    {"hour": 10, "minute": 0},
    {"hour": 15, "minute": 0},
    {"hour": 21, "minute": 0}
  ]'::jsonb;

COMMENT ON COLUMN public.telegram_marketing_settings.daily_reminder_times_manila IS
  'Array of objects {"hour":0-23,"minute":0-59} Manila local — synced to pg_cron as separate daily jobs telegram-marketing-daily-slot-* (UTC minute hour * * *).';

CREATE OR REPLACE FUNCTION public.sync_telegram_marketing_daily_cron_jobs(p_slots jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, vault, pg_temp
AS $fn$
DECLARE
  r RECORD;
  i int;
  v_len int;
  v_hour int;
  v_minute int;
  v_key int;
  v_seen int[] := '{}';
  v_dup boolean;
  utc_total int;
  utc_h int;
  utc_m int;
  cron_expr text;
  job_name text;
  sk int;
  v_scheduled int := 0;
  v_cmd_body text := $BODY$
SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
         || '/functions/v1/telegram-marketing-cron',
  headers := (
    CASE
      WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets ds WHERE ds.name = 'telegram_cron_secret')
      THEN jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'X-Telegram-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'telegram_cron_secret')
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
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) < 1 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'p_slots must be a non-empty JSON array');
  END IF;

  IF jsonb_array_length(p_slots) > 8 THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'at most 8 daily times');
  END IF;

  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname = 'telegram-marketing-daily-manila'
       OR jobname LIKE 'telegram-marketing-daily-slot-%'
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  v_len := jsonb_array_length(p_slots);
  FOR i IN 0 .. (v_len - 1) LOOP
    IF jsonb_typeof(p_slots -> i) <> 'object' THEN
      RETURN jsonb_build_object('ok', FALSE, 'error', 'each slot must be an object');
    END IF;

    v_hour := (p_slots -> i ->> 'hour')::int;
    v_minute := (p_slots -> i ->> 'minute')::int;

    IF v_hour IS NULL OR v_hour < 0 OR v_hour > 23 OR v_minute IS NULL OR v_minute < 0 OR v_minute > 59 THEN
      RETURN jsonb_build_object(
        'ok', FALSE,
        'error',
        format('invalid slot[%s]: need hour 0–23 and minute 0–59', i)
      );
    END IF;

    v_key := v_hour * 60 + v_minute;
    v_dup := FALSE;
    FOREACH sk IN ARRAY v_seen
    LOOP
      IF sk = v_key THEN v_dup := TRUE; EXIT; END IF;
    END LOOP;
    IF v_dup THEN CONTINUE; END IF;
    v_seen := array_append(v_seen, v_key);

    -- Manila +08 → UTC minute-of-day; offset +2880 keeps MOD positive (two-day wrap).
    utc_total := (v_hour * 60 + v_minute - 480 + 2880) % 1440;
    utc_h := utc_total / 60;
    utc_m := utc_total % 60;
    cron_expr := utc_m::text || ' ' || utc_h::text || ' * * *';
    job_name := 'telegram-marketing-daily-slot-' || v_scheduled::text;

    PERFORM cron.schedule(job_name, cron_expr, v_cmd_body);

    v_scheduled := v_scheduled + 1;
  END LOOP;

  IF v_scheduled < 1 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error',
      'no unique slots remained after duplicate removal'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',
    TRUE,
    'scheduled',
    v_scheduled,
    'jobNamePrefix',
    'telegram-marketing-daily-slot-'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok',
      FALSE,
      'error',
      'sync_telegram_marketing_daily_cron_jobs failed: ' || sqlerrm
    );
END;
$fn$;

COMMENT ON FUNCTION public.sync_telegram_marketing_daily_cron_jobs(jsonb) IS
  'Rebuilds telegram-marketing-daily-slot-* cron jobs from Manila clock slots. SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.sync_telegram_marketing_daily_cron_jobs(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_telegram_marketing_daily_cron_jobs(jsonb) TO service_role;
