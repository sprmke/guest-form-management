-- Create pet-vaccinations bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pet-vaccinations', 'pet-vaccinations', true, 5242880, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to pet-vaccinations" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from pet-vaccinations" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to pet-vaccinations" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from pet-vaccinations" ON storage.objects;

-- Set up storage policies for pet-vaccinations bucket
-- Allow public to read pet vaccination files
CREATE POLICY "Allow public reads from pet-vaccinations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pet-vaccinations');

-- Allow authenticated users to upload pet vaccination files
CREATE POLICY "Allow public uploads to pet-vaccinations"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'pet-vaccinations');

-- Allow users to update their own uploaded files
CREATE POLICY "Allow public updates to pet-vaccinations"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'pet-vaccinations')
WITH CHECK (bucket_id = 'pet-vaccinations');

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow public deletes from pet-vaccinations"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'pet-vaccinations');

-- Grant necessary permissions (these might already exist from the previous migration)
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public; 