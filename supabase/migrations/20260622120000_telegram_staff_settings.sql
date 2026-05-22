-- Telegram staff/cleaner notifications: daily booking summary to staff Telegram group.
-- Mirrors telegram_marketing_settings pattern. Access only via Edge Functions (service role).

CREATE TABLE IF NOT EXISTS public.telegram_staff_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_summary_template TEXT NOT NULL,
  daily_summary_time_manila JSONB NOT NULL DEFAULT '{"hour": 8, "minute": 0}'::jsonb
);

ALTER TABLE public.telegram_staff_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_staff_settings IS
  'Single-row staff notification config. Daily booking summary sent to staff/cleaner Telegram group.';

INSERT INTO public.telegram_staff_settings (
  id,
  daily_summary_template
) VALUES (
  1,
  E'📋 Today''s Booking\n\nBooking Details\n{{check_in_date}} - {{check_out_date}}\n{{check_in_time}} - {{check_out_time}}\n{{nights}} night/s, {{pax}} pax\n\nGuest Details\n{{primary_guest_name}}, {{guest_phone}}\n\nAdditional Details\n{{decor_status}}, {{pet_status}}\nSpecial Requests: {{special_requests}}\nTotal guest balance: {{total_guest_balance}}\n\nNext Bookings\n{{next_bookings}}\n\n{{booking_link}}'
)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_staff_settings TO service_role;

-- Cron sync RPC for staff daily summary (single slot, reuses pattern from marketing).

CREATE OR REPLACE FUNCTION public.sync_telegram_staff_daily_cron_job(p_slot jsonb)
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
         || '/functions/v1/telegram-staff-cron',
  headers := (
    CASE
      WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets ds WHERE ds.name = 'telegram_staff_cron_secret')
      THEN jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'X-Telegram-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'telegram_staff_cron_secret')
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

  -- Remove old job if exists
  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname = 'telegram-staff-daily'
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  -- Manila +08 → UTC
  utc_total := (v_hour * 60 + v_minute - 480 + 2880) % 1440;
  utc_h := utc_total / 60;
  utc_m := utc_total % 60;
  cron_expr := utc_m::text || ' ' || utc_h::text || ' * * *';

  PERFORM cron.schedule('telegram-staff-daily', cron_expr, v_cmd_body);

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
      'error', 'sync_telegram_staff_daily_cron_job failed: ' || sqlerrm
    );
END;
$fn$;

COMMENT ON FUNCTION public.sync_telegram_staff_daily_cron_job(jsonb) IS
  'Rebuilds telegram-staff-daily cron job from Manila clock slot. SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.sync_telegram_staff_daily_cron_job(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_telegram_staff_daily_cron_job(jsonb) TO service_role;
