-- Replace legacy BDO/BPI with GoTyme in the sd_refund_bank allow-list (other_bank flow).

UPDATE guest_submissions
SET sd_refund_bank = NULL
WHERE sd_refund_bank IN ('BDO', 'BPI');

ALTER TABLE guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_sd_refund_bank_check;

ALTER TABLE guest_submissions
  ADD CONSTRAINT guest_submissions_sd_refund_bank_check
  CHECK (
    sd_refund_bank IS NULL
    OR sd_refund_bank IN ('GCash', 'GoTyme', 'Maribank')
  );

COMMENT ON COLUMN guest_submissions.sd_refund_bank IS
  'When method=other_bank: GCash | GoTyme | Maribank.';
