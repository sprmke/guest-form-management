-- Add parent booking status PENDING_DOCUMENTS and completion markers
-- for its parallel sub-statuses (GAF / parking / pet).

BEGIN;

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS gaf_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parking_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pet_completed_at TIMESTAMPTZ;

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_status_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_status_check
  CHECK (status IN (
    'PENDING_REVIEW',
    'PENDING_DOCUMENTS',
    'PENDING_GAF',
    'PENDING_PARKING_REQUEST',
    'PENDING_PET_REQUEST',
    'READY_FOR_CHECKIN',
    'PENDING_SD_REFUND_DETAILS',
    'PENDING_SD_REFUND',
    'COMPLETED',
    'CANCELLED'
  ));

COMMENT ON COLUMN guest_submissions.gaf_completed_at IS
  'Timestamp when Pending GAF sub-status is marked complete under PENDING_DOCUMENTS.';
COMMENT ON COLUMN guest_submissions.parking_completed_at IS
  'Timestamp when Pending Parking Request sub-status is marked complete under PENDING_DOCUMENTS.';
COMMENT ON COLUMN guest_submissions.pet_completed_at IS
  'Timestamp when Pending Pet Request sub-status is marked complete under PENDING_DOCUMENTS.';

COMMIT;
