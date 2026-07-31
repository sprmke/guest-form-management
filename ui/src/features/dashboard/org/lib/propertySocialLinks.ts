import type { AppSettingsFormValues } from '@/features/dashboard/bookings/hooks/useAppSettings';
import type { OrgOperatorSettingsFormValues } from '@/features/dashboard/org/hooks/useOrgSettings';

export type SocialLinkKey = keyof Pick<
  AppSettingsFormValues,
  'facebookPageUrl' | 'airbnbUrl' | 'instagramUrl' | 'tiktokUrl'
>;

export type OrgSocialLinks = Pick<
  OrgOperatorSettingsFormValues,
  'facebookPageUrl' | 'airbnbUrl' | 'instagramUrl' | 'tiktokUrl'
>;

export const SOCIAL_LINK_KEYS: SocialLinkKey[] = [
  'facebookPageUrl',
  'airbnbUrl',
  'instagramUrl',
  'tiktokUrl',
];

export const SOCIAL_LINK_FIELD_IDS: Record<SocialLinkKey, string> = {
  facebookPageUrl: 'property-facebook-page-url',
  airbnbUrl: 'property-airbnb-url',
  instagramUrl: 'property-instagram-url',
  tiktokUrl: 'property-tiktok-url',
};

/** Empty stored value = inherit organization link. */
export function propertySocialLinkInherits(stored: string): boolean {
  return stored.trim() === '';
}

export function effectiveSocialLink(stored: string, orgValue: string): string {
  const trimmed = stored.trim();
  if (trimmed) return trimmed;
  return orgValue.trim();
}

/** DB patch — clear override when empty or identical to org (avoid duplicate storage). */
export function propertySocialLinkStoredValue(stored: string, orgValue: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return '';
  if (trimmed === orgValue.trim()) return '';
  return trimmed;
}

export function propertySocialLinksEquivalent(
  left: string,
  right: string,
  orgValue: string
): boolean {
  return (
    propertySocialLinkStoredValue(left, orgValue).toLowerCase() ===
    propertySocialLinkStoredValue(right, orgValue).toLowerCase()
  );
}

export function allPropertySocialLinksInherit(
  draft: Pick<AppSettingsFormValues, SocialLinkKey>
): boolean {
  return SOCIAL_LINK_KEYS.every((key) => propertySocialLinkInherits(draft[key]));
}

export function anyPropertySocialLinkCustom(
  draft: Pick<AppSettingsFormValues, SocialLinkKey>
): boolean {
  return SOCIAL_LINK_KEYS.some((key) => !propertySocialLinkInherits(draft[key]));
}

export function normalizePropertySocialLinksForSave(
  draft: AppSettingsFormValues,
  orgSocialLinks: OrgSocialLinks
): Pick<AppSettingsFormValues, SocialLinkKey> {
  return {
    facebookPageUrl: propertySocialLinkStoredValue(
      draft.facebookPageUrl,
      orgSocialLinks.facebookPageUrl
    ),
    airbnbUrl: propertySocialLinkStoredValue(draft.airbnbUrl, orgSocialLinks.airbnbUrl),
    instagramUrl: propertySocialLinkStoredValue(draft.instagramUrl, orgSocialLinks.instagramUrl),
    tiktokUrl: propertySocialLinkStoredValue(draft.tiktokUrl, orgSocialLinks.tiktokUrl),
  };
}
