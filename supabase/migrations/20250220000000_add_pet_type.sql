-- Add pet_type column to guest_submissions table
ALTER TABLE guest_submissions
ADD COLUMN pet_type TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN guest_submissions.pet_type IS 'Type of pet (e.g., Dog, Cat)';


