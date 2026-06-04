-- Configurable GCash / InstaPay QR image for guest form + ready-for-check-in email.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS gcash_qr_image_url TEXT;

COMMENT ON COLUMN public.app_settings.gcash_qr_image_url IS
  'Public URL of the GCash/InstaPay QR image shown on the guest form Payment step and ready-for-check-in email. When null, falls back to {public_guest_app_origin}/images/kame-home-gcash-qr-payment.jpg.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-settings-assets',
  'app-settings-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read app-settings-assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role write app-settings-assets" ON storage.objects;

CREATE POLICY "Public read app-settings-assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'app-settings-assets');

CREATE POLICY "Service role write app-settings-assets"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'app-settings-assets')
  WITH CHECK (bucket_id = 'app-settings-assets');
