-- Phase 0 — approved-gafs + approved-pet-forms buckets.
-- Both are PRIVATE: approved government forms (GAF, pet GAF) contain guest PII and
-- are already attached directly to the ready-for-check-in email, so we don't need
-- public URLs. Only the service role (Edge Functions) reads/writes them.
-- See docs/NEW_FLOW_PLAN.md §2 and §3.4.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('approved-gafs',      'approved-gafs',      FALSE, 10485760, ARRAY['application/pdf']),
  ('approved-pet-forms', 'approved-pet-forms', FALSE, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop any existing policies so re-running this migration cleanly rewrites them.
DROP POLICY IF EXISTS "Service role full access to approved-gafs"      ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to approved-pet-forms" ON storage.objects;

CREATE POLICY "Service role full access to approved-gafs"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'approved-gafs')
  WITH CHECK (bucket_id = 'approved-gafs');

CREATE POLICY "Service role full access to approved-pet-forms"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'approved-pet-forms')
  WITH CHECK (bucket_id = 'approved-pet-forms');
