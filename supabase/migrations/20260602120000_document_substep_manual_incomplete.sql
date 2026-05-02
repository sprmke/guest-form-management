-- Allow admins to mark GAF / pet nested steps "incomplete" while keeping approved PDF URLs.
-- Parking remains keyed only on parking_completed_at (clear timestamp = incomplete).

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS gaf_manual_incomplete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pet_manual_incomplete BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN guest_submissions.gaf_manual_incomplete IS
  'When true, Pending Documents treats GAF as incomplete even if approved_gaf_pdf_url or gaf_completed_at is set. Cleared on admin "mark complete" or Gmail approval.';

COMMENT ON COLUMN guest_submissions.pet_manual_incomplete IS
  'When true, Pending Documents treats pet as incomplete even if approved_pet_pdf_url or pet_completed_at is set. Cleared on admin "mark complete" or Gmail approval.';
