-- Disaster-recovery: hourly admin ops Telegram cron (pg_cron + pg_net).
-- Requires Vault secrets: project_url, anon_key, optional telegram_admin_cron_secret.
-- Edge secret: TELEGRAM_ADMIN_CRON_SECRET (optional; must match Vault when set).

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'telegram-admin-hourly';

SELECT cron.schedule(
  'telegram-admin-hourly',
  '0 * * * *',
  $$
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
  $$
);
