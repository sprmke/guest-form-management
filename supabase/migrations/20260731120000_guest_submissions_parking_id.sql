-- Standalone parking-slot reservations on guest_submissions (mutually exclusive with property_id).

ALTER TABLE public.guest_submissions
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS parking_id UUID REFERENCES public.parkings (id) ON DELETE RESTRICT;

ALTER TABLE public.guest_submissions
  DROP CONSTRAINT IF EXISTS guest_submissions_property_or_parking_check;

ALTER TABLE public.guest_submissions
  ADD CONSTRAINT guest_submissions_property_or_parking_check
  CHECK (
    ((property_id IS NOT NULL)::int + (parking_id IS NOT NULL)::int) = 1
  );

CREATE INDEX IF NOT EXISTS idx_guest_submissions_parking_id
  ON public.guest_submissions (parking_id)
  WHERE parking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_submissions_parking_status
  ON public.guest_submissions (parking_id, status)
  WHERE parking_id IS NOT NULL;

COMMENT ON COLUMN public.guest_submissions.parking_id IS
  'Standalone parking-slot reservation; mutually exclusive with property_id.';
