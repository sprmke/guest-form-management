-- Add booking_source column to guest_submissions
-- Tracks whether a booking came via Facebook (direct) or Airbnb.
-- Default is 'Facebook' for all existing rows.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'Facebook';
