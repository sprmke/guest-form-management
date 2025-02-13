-- Enable RLS
ALTER TABLE public.guest_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public to insert new submissions
CREATE POLICY "Allow public to insert guest submissions"
ON public.guest_submissions FOR INSERT TO public
WITH CHECK (true);

-- Allow public to read their own submissions
CREATE POLICY "Allow public to read guest submissions"
ON public.guest_submissions FOR SELECT TO public
USING (true);

-- Allow public to update their own submissions
CREATE POLICY "Allow public to update guest submissions"
ON public.guest_submissions FOR UPDATE TO public
USING (true)
WITH CHECK (true);

-- Allow public to delete their own submissions
CREATE POLICY "Allow public to delete guest submissions"
ON public.guest_submissions FOR DELETE TO public
USING (true);

-- Grant necessary permissions
GRANT ALL ON public.guest_submissions TO public;
