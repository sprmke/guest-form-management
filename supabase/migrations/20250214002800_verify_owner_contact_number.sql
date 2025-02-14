-- Check if owner_contact_number column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'guest_submissions'
        AND column_name = 'owner_contact_number'
    ) THEN
        ALTER TABLE guest_submissions
        ADD COLUMN owner_contact_number TEXT NOT NULL DEFAULT '0962 541 2941';

        -- Remove the default constraint after adding the column
        ALTER TABLE guest_submissions
        ALTER COLUMN owner_contact_number DROP DEFAULT;
    END IF;
END $$;
