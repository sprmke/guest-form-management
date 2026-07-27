-- Edge functions use supabaseServiceRole() (Postgres role service_role).
-- RLS-enabled tables still need explicit GRANTs; without them PostgREST returns
-- "permission denied for table …" even though service_role bypasses RLS policies.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_mail_integration TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_mail_oauth_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_line_items TO service_role;
