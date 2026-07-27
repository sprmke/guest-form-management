-- Multiple payment methods per property (JSONB array on app_settings).
-- Backfill from legacy payment_provider / gcash_* columns.

BEGIN;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.app_settings.payment_methods IS
  'Array of { id, provider, accountName, accountNumber, qrImageUrl, isPrimary }. Primary syncs to legacy gcash_* columns.';

UPDATE public.app_settings
SET payment_methods = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'provider', COALESCE(NULLIF(trim(payment_provider), ''), 'GCash'),
    'accountName', COALESCE(trim(gcash_name), ''),
    'accountNumber', COALESCE(trim(gcash_number), ''),
    'qrImageUrl', NULLIF(trim(gcash_qr_image_url), ''),
    'isPrimary', true
  )
)
WHERE payment_methods = '[]'::jsonb
  AND (
    NULLIF(trim(gcash_name), '') IS NOT NULL
    OR NULLIF(trim(gcash_number), '') IS NOT NULL
    OR NULLIF(trim(payment_provider), '') IS NOT NULL
    OR NULLIF(trim(gcash_qr_image_url), '') IS NOT NULL
  );

COMMIT;
