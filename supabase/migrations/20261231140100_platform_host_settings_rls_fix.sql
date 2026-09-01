-- Host platform settings: service-role only (hosts read via list-host-announcements edge function).

DROP POLICY IF EXISTS platform_host_settings_select ON public.platform_host_settings;
REVOKE SELECT ON public.platform_host_settings FROM authenticated;
