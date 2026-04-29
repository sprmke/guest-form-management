-- Optional line item: early check-in, late check-out, decor, etc.
-- Captured on PENDING_REVIEW → PENDING_GAF (ReviewPricingForm). Sheet column AX (see sheetsService).

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS guest_additional_fee NUMERIC(12, 2);

COMMENT ON COLUMN guest_submissions.guest_additional_fee IS
  'Miscellaneous guest charges (early CI, late CO, surprise decor, etc.). Included in admin/email total-due-at-check-in math.';
