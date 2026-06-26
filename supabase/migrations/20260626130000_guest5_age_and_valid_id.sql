-- Guest 5 age + valid ID (guest5_name already exists on guest_submissions).
ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS guest5_age INTEGER
    CHECK (guest5_age IS NULL OR (guest5_age >= 0 AND guest5_age <= 120)),
  ADD COLUMN IF NOT EXISTS guest5_valid_id_url TEXT;

COMMENT ON COLUMN public.guest_submissions.guest5_age IS
  'Age of guest 5; ages 5 and below count as children for Azure pax reporting.';
COMMENT ON COLUMN public.guest_submissions.guest5_valid_id_url IS
  'Valid ID image URL for guest 5 when age is 18 or above.';
