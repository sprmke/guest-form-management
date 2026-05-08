-- Remove test-booking flag; staging/local environments replace dedicated test rows.
ALTER TABLE public.guest_submissions
  DROP COLUMN IF EXISTS is_test_booking;
