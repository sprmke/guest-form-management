-- Add status column to guest_submissions table (must run after create_guest_submissions_table).
-- Default value is 'booked' for all existing and new bookings.
ALTER TABLE guest_submissions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'booked' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_submissions_status ON guest_submissions(status);

COMMENT ON COLUMN guest_submissions.status IS 'Booking status: booked (active) or canceled';
