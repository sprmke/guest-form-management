-- Phase 0 — parking-endorsements bucket.
-- Public (so URLs can be embedded in the ready-for-check-in email and admin UI).
-- Mirrors the existing "payment-receipts" / "valid-ids" pattern from 20250213045323.
-- See docs/NEW_FLOW_PLAN.md §2 and .cursor/rules/booking-workflow.mdc.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parking-endorsements',
  'parking-endorsements',
  TRUE,
  5242880, -- 5 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public reads from parking-endorsements"   ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to parking-endorsements"   ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to parking-endorsements"   ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from parking-endorsements" ON storage.objects;

CREATE POLICY "Allow public reads from parking-endorsements"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'parking-endorsements');

-- Uploads are triggered by admin-only Edge Functions (verify_jwt = true on upload-booking-asset).
-- The bucket policy intentionally mirrors the existing public-insert pattern so that local
-- development + anon key flows still work; production access control is enforced at the Edge Function.
CREATE POLICY "Allow public uploads to parking-endorsements"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'parking-endorsements');

CREATE POLICY "Allow public updates to parking-endorsements"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'parking-endorsements')
  WITH CHECK (bucket_id = 'parking-endorsements');

CREATE POLICY "Allow public deletes from parking-endorsements"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'parking-endorsements');
