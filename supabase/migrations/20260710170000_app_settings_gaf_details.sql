-- GAF PDF owner/unit defaults (Admin → Settings → GAF Details).
-- NULL columns fall back to built-in defaults in _shared/appSettings.ts.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS gaf_unit_owner TEXT,
  ADD COLUMN IF NOT EXISTS gaf_tower_and_unit_number TEXT,
  ADD COLUMN IF NOT EXISTS gaf_owner_onsite_contact_person TEXT,
  ADD COLUMN IF NOT EXISTS gaf_owner_contact_number TEXT;

COMMENT ON COLUMN public.app_settings.gaf_unit_owner IS
  'Unit owner name printed on Guest Advise Form (GAF) PDF.';
COMMENT ON COLUMN public.app_settings.gaf_tower_and_unit_number IS
  'Tower and unit label on GAF PDF (e.g. Monaco 2604).';
COMMENT ON COLUMN public.app_settings.gaf_owner_onsite_contact_person IS
  'On-site contact person on GAF PDF.';
COMMENT ON COLUMN public.app_settings.gaf_owner_contact_number IS
  'Owner contact phone on GAF PDF.';
