-- Admin operations Telegram alerts: booking workflow reminders to a dedicated admin group.
-- Mirrors telegram_staff_settings / telegram_marketing_settings patterns.

CREATE TABLE IF NOT EXISTS public.telegram_admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  notify_on_new_booking BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_sd_form_submitted BOOLEAN NOT NULL DEFAULT TRUE,
  notify_pending_docs_hourly BOOLEAN NOT NULL DEFAULT TRUE,
  notify_balance_receipt_hourly BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sd_refund_pending_hourly BOOLEAN NOT NULL DEFAULT TRUE,

  new_booking_template TEXT NOT NULL,
  pending_docs_template TEXT NOT NULL,
  balance_receipt_template TEXT NOT NULL,
  sd_form_submitted_template TEXT NOT NULL,
  sd_refund_pending_template TEXT NOT NULL
);

ALTER TABLE public.telegram_admin_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_admin_settings IS
  'Single-row admin ops notification config. Event + hourly Telegram alerts for booking workflow.';

INSERT INTO public.telegram_admin_settings (
  id,
  new_booking_template,
  pending_docs_template,
  balance_receipt_template,
  sd_form_submitted_template,
  sd_refund_pending_template
) VALUES (
  1,
  E'🆕 New Booking Request\n\nGuest: {{primary_guest_name}}\nPhone: {{guest_phone}}\nDates: {{check_in_date}} → {{check_out_date}}\nStatus: {{status_label}}\n\n{{booking_link}}',
  E'⚠️ Pending Documents — Check-in Today\n\nGuest: {{primary_guest_name}}\nCheck-in: {{check_in_date}} at {{check_in_time}}\nStill needed: {{pending_docs_list}}\nStatus: {{status_label}}\n\n{{booking_link}}',
  E'💳 Balance Receipt Needed\n\nGuest: {{primary_guest_name}}\nBalance due: {{total_guest_balance}}\nUpload payment receipt in admin.\n\n{{booking_link}}',
  E'📝 SD Refund Form Submitted\n\nGuest: {{primary_guest_name}}\nMethod: {{sd_refund_method}}\nCheck-out: {{check_out_date}}\n\nProcess refund in admin.\n{{booking_link}}',
  E'💰 SD Refund Pending Processing\n\nGuest: {{primary_guest_name}}\nMethod: {{sd_refund_method}}\nProcess the refund now:\n\n{{booking_link}}'
)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_admin_settings TO service_role;

-- Hourly dedupe: one send per booking + scenario + Manila hour bucket.
CREATE TABLE IF NOT EXISTS public.telegram_admin_notification_log (
  id BIGSERIAL PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.guest_submissions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'pending_docs',
      'balance_receipt',
      'sd_refund_pending'
    )
  ),
  hour_bucket TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, notification_type, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_telegram_admin_notification_log_sent_at
  ON public.telegram_admin_notification_log (sent_at DESC);

ALTER TABLE public.telegram_admin_notification_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.telegram_admin_notification_log IS
  'Idempotency log for hourly admin Telegram alerts (Manila hour bucket).';

GRANT SELECT, INSERT, DELETE ON public.telegram_admin_notification_log TO service_role;

-- Hourly pg_cron job (UTC minute 0 every hour). Handler checks enabled flags.
CREATE OR REPLACE FUNCTION public.sync_telegram_admin_hourly_cron_job()
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
         || '/functions/v1/telegram-admin-cron',
  headers := (
    CASE
      WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets ds WHERE ds.name = 'telegram_admin_cron_secret')
      THEN jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'X-Telegram-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'telegram_admin_cron_secret')
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
    WHERE jobname = 'telegram-admin-hourly'
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;

  PERFORM cron.schedule('telegram-admin-hourly', cron_expr, v_cmd_body);

  RETURN jsonb_build_object('ok', TRUE, 'cronExpr', cron_expr);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'sync_telegram_admin_hourly_cron_job failed: ' || sqlerrm
    );
END;
$fn$;

COMMENT ON FUNCTION public.sync_telegram_admin_hourly_cron_job() IS
  'Rebuilds telegram-admin-hourly cron (every hour at :00 UTC). SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.sync_telegram_admin_hourly_cron_job() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_telegram_admin_hourly_cron_job() TO service_role;

-- Seed cron on migration (no-op if pg_cron/vault unavailable in local dev).
DO $do$
BEGIN
  PERFORM public.sync_telegram_admin_hourly_cron_job();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'sync_telegram_admin_hourly_cron_job skipped: %', SQLERRM;
END;
$do$;
