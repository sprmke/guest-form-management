-- AI valid ID validation results (Gemini Flash vision).

ALTER TABLE public.guest_submissions
  ADD COLUMN IF NOT EXISTS valid_id_ai_verdict TEXT,
  ADD COLUMN IF NOT EXISTS valid_id_ai_summary TEXT;

COMMENT ON COLUMN public.guest_submissions.valid_id_ai_verdict IS
  'AI verdict for guest valid ID image: valid, likely_valid, unclear, invalid, skipped';
COMMENT ON COLUMN public.guest_submissions.valid_id_ai_summary IS
  'Short AI explanation for valid ID validation';
