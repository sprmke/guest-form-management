/*
  # Create guest submissions table

  1. New Tables
    - `guest_submissions`
      - `id` (uuid, primary key)
      - `facebook_name` (text)
      - `full_name` (text)
      - `email` (text)
      - `contact_number` (text)
      - `address` (text)
      - `check_in_out` (text)
      - `other_guests` (text[])
      - `requests` (text)
      - `find_us` (text)
      - `need_parking` (boolean)
      - `has_pets` (boolean)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE guest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_name text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  contact_number text NOT NULL,
  address text NOT NULL,
  check_in_out text NOT NULL,
  other_guests text[],
  requests text,
  find_us text NOT NULL,
  need_parking boolean DEFAULT false,
  has_pets boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE guest_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert
CREATE POLICY "Users can insert guest submissions"
  ON guest_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to view their submissions
CREATE POLICY "Users can view guest submissions"
  ON guest_submissions
  FOR SELECT
  TO authenticated
  USING (true);