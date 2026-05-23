-- Guest-paid parking window (subset of stay). Admin sets in PayParkingModal.
ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS parking_check_in_date  TEXT,
  ADD COLUMN IF NOT EXISTS parking_check_out_date TEXT;

COMMENT ON COLUMN guest_submissions.parking_check_in_date IS
  'Start of guest-paid parking window (MM-DD-YYYY). Defaults to stay check-in when unset.';
COMMENT ON COLUMN guest_submissions.parking_check_out_date IS
  'End of guest-paid parking window (MM-DD-YYYY, checkout day). Defaults to stay check-out when unset.';
