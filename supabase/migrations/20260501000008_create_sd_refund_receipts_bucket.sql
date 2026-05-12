-- Phase 0 — sd-refund-receipts bucket.
-- PRIVATE: receipts contain payment info. Only Edge Functions (service role) touch them.
-- See docs/NEW_FLOW_PLAN.md §2 and §1.4 (PENDING_SD_REFUND stage).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sd-refund-receipts',
  'sd-refund-receipts',
  FALSE,
  5242880, -- 5 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Service role full access to sd-refund-receipts" ON storage.objects;

CREATE POLICY "Service role full access to sd-refund-receipts"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'sd-refund-receipts')
  WITH CHECK (bucket_id = 'sd-refund-receipts');
