ALTER TABLE guest_submissions DROP CONSTRAINT IF EXISTS valid_times;

UPDATE guest_submissions
SET check_in_time = to_char(check_in_time::time, 'HH24:MI')
WHERE check_in_time ~ '^\d{1,2}:\d{2}\s*[AaPp][Mm]$';

UPDATE guest_submissions
SET check_out_time = to_char(check_out_time::time, 'HH24:MI')
WHERE check_out_time ~ '^\d{1,2}:\d{2}\s*[AaPp][Mm]$';

ALTER TABLE guest_submissions ALTER COLUMN check_in_time SET DEFAULT '14:00';
ALTER TABLE guest_submissions ALTER COLUMN check_out_time SET DEFAULT '11:00';
