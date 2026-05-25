-- Operator-tunable app config (Settings UI). Secrets stay in Edge env / Supabase Dashboard.
-- Access only via Edge Functions (service role); no public policies.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Email routing (non-secret addresses)
  email_to TEXT,
  email_reply_to TEXT,
  parking_owner_emails TEXT,

  -- Gmail listener allow-list (visible From headers on approval replies)
  permit_approver_emails TEXT,

  -- SD refund cron tuning
  sd_refund_cron_email_lead_minutes INTEGER CHECK (
    sd_refund_cron_email_lead_minutes IS NULL
    OR (sd_refund_cron_email_lead_minutes >= 0 AND sd_refund_cron_email_lead_minutes <= 10080)
  ),
  sd_refund_cron_max_checkout_age_days INTEGER CHECK (
    sd_refund_cron_max_checkout_age_days IS NULL
    OR (sd_refund_cron_max_checkout_age_days >= 0 AND sd_refund_cron_max_checkout_age_days <= 365)
  ),

  -- Guest-facing URLs
  public_guest_app_origin TEXT,
  facebook_reviews_url TEXT,
  email_logo_url TEXT,

  -- Default when booking.parking_rate_guest is unset
  default_parking_rate_guest NUMERIC(12, 2) CHECK (
    default_parking_rate_guest IS NULL OR default_parking_rate_guest > 0
  )
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.app_settings IS
  'Single-row operator config editable from Admin → Settings. NULL columns fall back to Edge env vars.';

INSERT INTO public.app_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;
