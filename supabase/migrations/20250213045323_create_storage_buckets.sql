-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('payment-receipts', 'payment-receipts', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif']),
  ('templates', 'templates', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from payment-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role access to templates" ON storage.objects;

-- Create policies for payment-receipts bucket
CREATE POLICY "Allow public uploads to payment-receipts"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Allow public reads from payment-receipts"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'payment-receipts');

CREATE POLICY "Allow public updates to payment-receipts"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'payment-receipts')
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Allow public deletes from payment-receipts"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'payment-receipts');

-- Create policy for templates bucket
CREATE POLICY "Allow service role access to templates"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'templates');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public;

-- Create default folders
DO $$
BEGIN
  -- Create public folder in payment-receipts bucket
  INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version)
  VALUES (
    gen_random_uuid(),
    'payment-receipts',
    'public/',
    NULL,
    NOW(),
    NOW(),
    NOW(),
    '{"mimetype": "application/x-directory", "size": 0}',
    '1'
  )
  ON CONFLICT (bucket_id, name) DO NOTHING;
END $$; 