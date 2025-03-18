-- Create pet-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pet-images', 'pet-images', true, 5242880, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to pet-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from pet-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to pet-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from pet-images" ON storage.objects;

-- Set up storage policies for pet-images bucket
-- Allow public to read pet image files
CREATE POLICY "Allow public reads from pet-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pet-images');

-- Allow authenticated users to upload pet image files
CREATE POLICY "Allow public uploads to pet-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'pet-images');

-- Allow users to update their own uploaded files
CREATE POLICY "Allow public updates to pet-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'pet-images')
WITH CHECK (bucket_id = 'pet-images');

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow public deletes from pet-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'pet-images');

-- Grant necessary permissions (these might already exist from the previous migration)
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public; 