-- Normalize check_in_time / check_out_time to 24-hour "HH:MM" format.
--
-- The original CREATE TABLE used TEXT columns with 12-hour AM/PM defaults
-- ("02:00 PM", "11:00 AM") and a CHECK constraint (valid_times) that
-- rejected 24-hour values like "14:00".  The UI now sends 24-hour values
-- from <input type="time">, so we:
--   1. Drop the incompatible CHECK constraint.
--   2. Convert every existing 12-hour value to 24-hour.
--   3. Change the column DEFAULTs to 24-hour format.

-- 1. Drop the CHECK constraint (safe if already absent).
ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_times;

-- 2. Convert existing 12-hour AM/PM values → 24-hour HH:MM.
--    Handles "2:00 PM", "02:00 PM", "12:00 AM", "12:30 PM", etc.
--    Values already in HH:MM (e.g. "14:00") are left untouched.
UPDATE guest_submissions
SET check_in_time = to_char(check_in_time::time, 'HH24:MI')
WHERE check_in_time ~ '^\d{1,2}:\d{2}\s*[AaPp][Mm]$';

UPDATE guest_submissions
SET check_out_time = to_char(check_out_time::time, 'HH24:MI')
WHERE check_out_time ~ '^\d{1,2}:\d{2}\s*[AaPp][Mm]$';

-- 3. Update column defaults to 24-hour format.
ALTER TABLE guest_submissions ALTER COLUMN check_in_time SET DEFAULT '14:00';
ALTER TABLE guest_submissions ALTER COLUMN check_out_time SET DEFAULT '11:00';
