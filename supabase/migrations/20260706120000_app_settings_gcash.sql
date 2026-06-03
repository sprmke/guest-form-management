-- Guest-facing GCash payment details (Settings → Payment).
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS gcash_name TEXT,
  ADD COLUMN IF NOT EXISTS gcash_number TEXT;

COMMENT ON COLUMN public.app_settings.gcash_name IS
  'GCash account display name on guest form Payment step. NULL → env GCASH_NAME → default.';
COMMENT ON COLUMN public.app_settings.gcash_number IS
  'GCash mobile number on guest form Payment step. NULL → env GCASH_NUMBER → default.';
