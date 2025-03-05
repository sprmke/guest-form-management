-- Add pet_vaccination_url column to guest_submissions table
ALTER TABLE guest_submissions
ADD COLUMN IF NOT EXISTS pet_vaccination_url TEXT CHECK (
    pet_vaccination_url IS NULL OR 
    (has_pets = TRUE AND length(pet_vaccination_url) > 0)
);

-- Update existing rows where has_pets is TRUE but pet_vaccination_url is NULL
UPDATE guest_submissions
SET pet_vaccination_url = 'https://placeholder-url.com/pet-vaccination-record.jpg'
WHERE has_pets = TRUE AND pet_vaccination_url IS NULL;

-- Add comment to the column
COMMENT ON COLUMN guest_submissions.pet_vaccination_url IS 'URL of the uploaded pet vaccination record image. Required when has_pets is TRUE.';

-- Create an index for faster lookups when querying by has_pets and pet_vaccination_url
CREATE INDEX IF NOT EXISTS idx_guest_submissions_pet_vaccination 
ON guest_submissions(has_pets, pet_vaccination_url)
WHERE has_pets = TRUE; 