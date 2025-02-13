-- Enable RLS for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role access to templates" ON storage.objects;

-- Allow public uploads to payment-receipts bucket
CREATE POLICY "Allow public uploads to payment-receipts"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] != 'private'
);

-- Allow public reads from payment-receipts bucket
CREATE POLICY "Allow public reads from payment-receipts"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] != 'private'
);

-- Allow public updates to payment-receipts bucket
CREATE POLICY "Allow public updates to payment-receipts"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] != 'private'
)
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] != 'private'
);

-- Allow public deletes from payment-receipts bucket
CREATE POLICY "Allow public deletes from payment-receipts"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] != 'private'
);

-- Allow service role access to templates bucket
CREATE POLICY "Allow service role access to templates"
ON storage.objects
TO service_role
USING (
  bucket_id = 'templates'
);

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated; 