-- valid_times still referenced 12-hour AM/PM after 20260623120000_normalize_time_columns_to_24h.
-- Any UPDATE (e.g. pay-parking settings) re-validates the row and fails on 24h values like 14:00.

ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_times;

ALTER TABLE guest_submissions
  ADD CONSTRAINT valid_times CHECK (
    check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND
    check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ) NOT VALID;
