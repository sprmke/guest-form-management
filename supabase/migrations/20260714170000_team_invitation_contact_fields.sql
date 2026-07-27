-- Store intended guest contact on team invitations; applied to member row on accept.

ALTER TABLE public.property_invitations
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

COMMENT ON COLUMN public.property_invitations.display_name IS
  'Guest-facing display name pre-filled on accept into property_members.display_name';

COMMENT ON COLUMN public.property_invitations.contact_phone IS
  'Guest-facing phone pre-filled on accept into property_members.contact_phone';

COMMENT ON COLUMN public.organization_invitations.display_name IS
  'Guest-facing display name pre-filled on accept into organization_members.display_name';

COMMENT ON COLUMN public.organization_invitations.contact_phone IS
  'Guest-facing phone pre-filled on accept into organization_members.contact_phone';
