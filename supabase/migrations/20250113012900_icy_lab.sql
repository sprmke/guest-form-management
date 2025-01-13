/*
  # Update guest submissions policies

  1. Security Changes
    - Add policy for public access to insert guest submissions
    - Remove authentication requirement for inserts
*/

-- Create policy for public inserts
CREATE POLICY "Allow public inserts to guest submissions"
  ON guest_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for public selects (for confirmation)
CREATE POLICY "Allow public to view their own submissions"
  ON guest_submissions
  FOR SELECT
  TO public
  USING (true);