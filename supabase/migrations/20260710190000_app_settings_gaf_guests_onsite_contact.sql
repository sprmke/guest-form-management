-- Rename GAF onsite contact column to match PDF label (Guests' On-Site Contact Person).
ALTER TABLE public.app_settings
  RENAME COLUMN gaf_owner_onsite_contact_person TO gaf_guests_onsite_contact_person;

COMMENT ON COLUMN public.app_settings.gaf_guests_onsite_contact_person IS
  'Guests'' on-site contact person on the GAF Unit Owner / SPA Details row.';
