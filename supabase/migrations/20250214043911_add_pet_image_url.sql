-- Add pet_image_url column to guest_submissions table
ALTER TABLE guest_submissions
ADD COLUMN IF NOT EXISTS pet_image_url TEXT CHECK (
    pet_image_url IS NULL OR 
    (has_pets = TRUE AND length(pet_image_url) > 0)
);

-- Update existing rows where has_pets is TRUE but pet_image_url is NULL
UPDATE guest_submissions
SET pet_image_url = 'https://placeholder-url.com/pet-image.jpg'
WHERE has_pets = TRUE AND pet_image_url IS NULL;

-- Add comment to the column
COMMENT ON COLUMN guest_submissions.pet_image_url IS 'URL of the uploaded pet image. Required when has_pets is TRUE.';

-- Create an index for faster lookups when querying by has_pets and pet_image_url
CREATE INDEX IF NOT EXISTS idx_guest_submissions_pet_image 
ON guest_submissions(has_pets, pet_image_url)
WHERE has_pets = TRUE; 