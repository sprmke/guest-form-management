-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('payment-receipts', 'payment-receipts', true),
  ('templates', 'templates', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Set up storage policies
CREATE POLICY "Allow public uploads to payment-receipts"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'public'
);

CREATE POLICY "Allow public reads from payment-receipts"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'public'
);

CREATE POLICY "Allow service role access to templates"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'templates')
WITH CHECK (bucket_id = 'templates');

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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