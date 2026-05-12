-- Surprise decor: guest intent on public form; admin confirmation before leaving Pending Review.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS guest_requests_surprise_decor BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS surprise_decor_staff_acknowledged BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN guest_submissions.guest_requests_surprise_decor IS
  'True when the guest indicated they want a surprise decor setup (public form).';

COMMENT ON COLUMN guest_submissions.surprise_decor_staff_acknowledged IS
  'Admin confirms staff coordination (theme + final price) before PENDING_REVIEW → Pending Documents when guest_requests_surprise_decor is true.';
