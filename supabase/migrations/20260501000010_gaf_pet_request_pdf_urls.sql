-- Filled GAF / pet *request* PDFs (generated at admin PENDING_REVIEW → documents transition).
-- Distinct from approved_gaf_pdf_url / approved_pet_pdf_url (Azure-approved files from Gmail listener).

ALTER TABLE guest_submissions
  ADD COLUMN IF NOT EXISTS gaf_request_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pet_request_pdf_url TEXT;

COMMENT ON COLUMN guest_submissions.gaf_request_pdf_url IS
  'Storage URL for the filled guest GAF PDF generated when admin moves booking from PENDING_REVIEW to initial documents; not the Azure-approved PDF.';

COMMENT ON COLUMN guest_submissions.pet_request_pdf_url IS
  'Storage URL for the filled pet request PDF generated at the same transition when has_pets; not the Azure-approved pet form.';
