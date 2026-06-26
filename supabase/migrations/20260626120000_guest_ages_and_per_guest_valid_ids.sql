-- Per-guest ages and valid ID URLs (Azure requires ID for guests 18+).
ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS primary_guest_age INTEGER
    CHECK (primary_guest_age IS NULL OR (primary_guest_age >= 0 AND primary_guest_age <= 120)),
  ADD COLUMN IF NOT EXISTS guest2_age INTEGER
    CHECK (guest2_age IS NULL OR (guest2_age >= 0 AND guest2_age <= 120)),
  ADD COLUMN IF NOT EXISTS guest3_age INTEGER
    CHECK (guest3_age IS NULL OR (guest3_age >= 0 AND guest3_age <= 120)),
  ADD COLUMN IF NOT EXISTS guest4_age INTEGER
    CHECK (guest4_age IS NULL OR (guest4_age >= 0 AND guest4_age <= 120)),
  ADD COLUMN IF NOT EXISTS guest2_valid_id_url TEXT,
  ADD COLUMN IF NOT EXISTS guest3_valid_id_url TEXT,
  ADD COLUMN IF NOT EXISTS guest4_valid_id_url TEXT;

COMMENT ON COLUMN public.guest_submissions.primary_guest_age IS
  'Age of primary guest; ages 5 and below count as children.';
COMMENT ON COLUMN public.guest_submissions.guest2_valid_id_url IS
  'Valid ID image URL for guest 2 when age is 18 or above.';

-- Primary valid ID is only required for guests aged 18+.
ALTER TABLE public.guest_submissions
  ALTER COLUMN valid_id_url DROP NOT NULL;
