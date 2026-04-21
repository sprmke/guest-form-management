-- Phase 0 — Columns written by the Gmail listener when Azure approves the GAF / pet request PDFs.
-- Nullable; no rows are rewritten. See docs/NEW_FLOW_PLAN.md §2 and §3.4.

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS approved_gaf_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS approved_pet_pdf_url TEXT;

COMMENT ON COLUMN guest_submissions.approved_gaf_pdf_url IS 'URL of the approved GAF PDF persisted from Azure approval email. Written by gmail-listener / admin upload. Stored in approved-gafs bucket.';
COMMENT ON COLUMN guest_submissions.approved_pet_pdf_url IS 'URL of the approved pet-request PDF persisted from Azure approval email. Written by gmail-listener / admin upload. Stored in approved-pet-forms bucket.';
