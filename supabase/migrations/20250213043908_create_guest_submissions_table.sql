-- Create guest_submissions table
CREATE TABLE IF NOT EXISTS guest_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Required fields
    guest_facebook_name TEXT NOT NULL,
    primary_guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL CHECK (guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    guest_phone_number TEXT NOT NULL,
    guest_address TEXT NOT NULL,
    check_in_date TEXT NOT NULL,  -- Store as text to preserve frontend format
    check_out_date TEXT NOT NULL, -- Store as text to preserve frontend format
    
    -- Optional fields with defaults
    check_in_time TEXT DEFAULT '02:00 PM',  -- Store as text to preserve AM/PM format
    check_out_time TEXT DEFAULT '11:00 AM',  -- Store as text to preserve AM/PM format
    nationality TEXT DEFAULT 'Filipino',
    number_of_adults INTEGER DEFAULT 1 CHECK (number_of_adults >= 1),
    number_of_children INTEGER DEFAULT 0 CHECK (number_of_children >= 0),
    number_of_nights INTEGER NOT NULL,
    
    -- Additional guest names (optional)
    guest2_name TEXT CHECK (guest2_name IS NULL OR length(guest2_name) >= 2),
    guest3_name TEXT CHECK (guest3_name IS NULL OR length(guest3_name) >= 2),
    guest4_name TEXT CHECK (guest4_name IS NULL OR length(guest4_name) >= 2),
    guest5_name TEXT CHECK (guest5_name IS NULL OR length(guest5_name) >= 2),
    
    -- Special requests
    guest_special_requests TEXT,
    
    -- How did you find us
    find_us TEXT NOT NULL,
    find_us_details TEXT,
    
    -- Parking information
    need_parking BOOLEAN DEFAULT FALSE,
    car_plate_number TEXT CHECK (
        car_plate_number IS NULL OR 
        (need_parking = TRUE AND length(car_plate_number) > 0)
    ),
    car_brand_model TEXT CHECK (
        car_brand_model IS NULL OR 
        (need_parking = TRUE AND length(car_brand_model) > 0)
    ),
    car_color TEXT CHECK (
        car_color IS NULL OR 
        (need_parking = TRUE AND length(car_color) > 0)
    ),
    
    -- Pet information
    has_pets BOOLEAN DEFAULT FALSE,
    pet_name TEXT CHECK (
        pet_name IS NULL OR 
        (has_pets = TRUE AND length(pet_name) > 0)
    ),
    pet_breed TEXT CHECK (
        pet_breed IS NULL OR 
        (has_pets = TRUE AND length(pet_breed) > 0)
    ),
    pet_age TEXT CHECK (
        pet_age IS NULL OR 
        (has_pets = TRUE AND length(pet_age) > 0)
    ),
    pet_vaccination_date TEXT CHECK (
        pet_vaccination_date IS NULL OR 
        (has_pets = TRUE AND length(pet_vaccination_date) > 0)
    ),
    pet_vaccination_url TEXT CHECK (
        pet_vaccination_url IS NULL OR 
        (has_pets = TRUE AND length(pet_vaccination_url) > 0)
    ),
    
    -- Payment receipt
    payment_receipt_url TEXT NOT NULL,
    valid_id_url TEXT NOT NULL,
    
    -- Fixed values
    unit_owner TEXT NOT NULL,
    tower_and_unit_number TEXT NOT NULL,
    owner_onsite_contact_person TEXT NOT NULL,
    owner_contact_number TEXT NOT NULL,

    -- Add constraints
    CONSTRAINT valid_dates CHECK (
        check_in_date ~ '^\d{2}-\d{2}-\d{4}$' AND 
        check_out_date ~ '^\d{2}-\d{2}-\d{4}$' AND
        DATE(
            substring(check_out_date, 7, 4) || '-' || 
            substring(check_out_date, 1, 2) || '-' || 
            substring(check_out_date, 4, 2)
        ) > 
        DATE(
            substring(check_in_date, 7, 4) || '-' || 
            substring(check_in_date, 1, 2) || '-' || 
            substring(check_in_date, 4, 2)
        )
    ),
    CONSTRAINT valid_times CHECK (
        check_in_time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$' AND
        check_out_time ~ '^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$'
    )
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_submissions_email ON guest_submissions(guest_email);

-- Create an index on check-in date for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_submissions_checkin ON guest_submissions(check_in_date);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_submissions_updated_at
    BEFORE UPDATE ON guest_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
