-- Guest SD form no longer collects a cash pickup note; column removed.
ALTER TABLE guest_submissions
  DROP COLUMN IF EXISTS sd_refund_cash_pickup_note;
