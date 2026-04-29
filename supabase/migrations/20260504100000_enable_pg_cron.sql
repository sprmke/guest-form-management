-- Scheduled invokes of Edge Functions (gmail-listener, sd-refund-cron) use pg_cron + pg_net.
-- Local Supabase commonly has pg_net but not pg_cron until this runs; without it, cron.job
-- and cron.job_run_details do not exist (42P01). Hosted projects typically enable pg_cron
-- from the dashboard; CREATE EXTENSION IF NOT EXISTS is safe if already present.
-- See: https://supabase.com/docs/guides/cron/install
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
