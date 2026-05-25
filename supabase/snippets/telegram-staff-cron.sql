-- Staff daily summary cron — Vault + optional TELEGRAM_STAFF_CRON_SECRET
--
-- Preferred: Admin → **Staff** (`/staff`) → set daily time → **Save** — invokes
-- **`sync_telegram_staff_daily_cron_job`** (migration 20260622120000). The RPC
-- automatically includes `X-Telegram-Cron-Secret` when Vault has
-- **`telegram_staff_cron_secret`**.
--
-- Edge secrets (Dashboard → Edge Functions → Secrets):
--   TELEGRAM_STAFF_CHAT_ID          (required)
--   TELEGRAM_STAFF_BOT_TOKEN        (optional; falls back to TELEGRAM_BOT_TOKEN)
--   TELEGRAM_STAFF_CRON_SECRET      (optional; must match Vault telegram_staff_cron_secret)
--
-- Generate a new secret (host shell):
--   openssl rand -hex 32
--
-- 1) Store the same value in Edge secrets as TELEGRAM_STAFF_CRON_SECRET
-- 2) Store in Vault (run once in SQL Editor on hosted project):

/*
select vault.create_secret(
  '<paste TELEGRAM_STAFF_CRON_SECRET value>',
  'telegram_staff_cron_secret',
  'Staff telegram-staff-cron X-Telegram-Cron-Secret header'
);
*/

-- Verify Vault + cron job:

/*
select name from vault.secrets where name in ('project_url', 'anon_key', 'telegram_staff_cron_secret');

select jobname, schedule, active
from cron.job
where jobname = 'telegram-staff-daily';
*/

-- Re-sync cron after Vault is fixed (8:00 AM Manila example):

/*
select public.sync_telegram_staff_daily_cron_job('{"hour": 8, "minute": 0}'::jsonb);
*/

-- Manual test (replace URL + anon key + secret):

/*
select net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/telegram-staff-cron',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <anon_key>',
    'X-Telegram-Cron-Secret', '<TELEGRAM_STAFF_CRON_SECRET>'
  ),
  body := '{}'::jsonb
);
*/

-- Unschedule: select cron.unschedule('telegram-staff-daily');
