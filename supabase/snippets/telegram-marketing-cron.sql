-- Reference: LEGACY ONE-SHOT `telegram-marketing-daily-manila` (single cron expression).
-- Preferred: deploy migration **`20260615105000_telegram_marketing_cron_slots.sql`**, then use
-- Admin → **Marketing** → **Daily reminder times** → **Save** — that invokes
-- **`sync_telegram_marketing_daily_cron_jobs`** (jobs **`telegram-marketing-daily-slot-*`**).
-- Use this snippet only when you still need manual SQL bootstrap or recovery.
-- Cron times: 10:00 / 15:00 / 21:00 Asia/Manila = 02:00 / 07:00 / 13:00 UTC → `0 2,7,13 * * *`
--
-- Edge secrets (Dashboard → Edge Functions → Secrets):
--   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
-- Optional: TELEGRAM_CRON_SECRET — when set, the cron POST must send header
--   X-Telegram-Cron-Secret: <same value> (add to Vault as telegram_cron_secret and use Option B).

-- Option A — no TELEGRAM_CRON_SECRET on Edge (anon Bearer only):
/*
select cron.schedule(
  'telegram-marketing-daily-manila',
  '0 2,7,13 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/telegram-marketing-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- Option B — TELEGRAM_CRON_SECRET set; store matching value in Vault as telegram_cron_secret:
/*
select cron.schedule(
  'telegram-marketing-daily-manila',
  '0 2,7,13 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/telegram-marketing-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'X-Telegram-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'telegram_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- Unschedule: select cron.unschedule('telegram-marketing-daily-manila');
