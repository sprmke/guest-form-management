-- Parking owner / agent (display name) — who parking was obtained from.
-- Distinct from parking_owner_email (broadcast / reply selection).

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS parking_owner TEXT;

COMMENT ON COLUMN guest_submissions.parking_owner IS
  'Parking owner or agent name — captured on PENDING_PARKING_REQUEST (admin workflow).';
