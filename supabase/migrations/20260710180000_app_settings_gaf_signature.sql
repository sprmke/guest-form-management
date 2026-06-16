-- Unit Owner / SPA signature image for GAF PDF overlay (Settings upload).

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS gaf_unit_owner_signature_url TEXT;

COMMENT ON COLUMN public.app_settings.gaf_unit_owner_signature_url IS
  'Public URL for Unit Owner/SPA signature drawn on GAF PDF; NULL uses template default.';
