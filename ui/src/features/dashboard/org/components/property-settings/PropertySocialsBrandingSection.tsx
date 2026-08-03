import { Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type {
  AppSettingsDto,
  AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyExternalReviewsBlock } from '@/features/dashboard/org/components/property-settings/PropertyExternalReviewsBlock';
import { PropertySettingsSectionAlert } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { PropertySuperhostVerificationBlock } from '@/features/dashboard/org/components/property-settings/PropertySuperhostVerificationBlock';
import { MainSocialPlatformPicker } from '@/features/dashboard/org/components/settings/MainSocialPlatformPicker';
import { SocialLinkInheritField } from '@/features/dashboard/org/components/settings/SocialLinkInheritField';
import type { SuperhostStatus } from '@/features/dashboard/org/lib/propertyExternalReviews';
import type { PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { propertySettingsSectionBanner } from '@/features/dashboard/org/lib/propertySettingsFieldError';
import type { OrgSocialLinks } from '@/features/dashboard/org/lib/propertySocialLinks';
import {
  effectiveMainSocialPlatform,
  effectiveSocialUrlMapWithModes,
  PLATFORM_TO_SOCIAL_LINK,
  SOCIAL_LINK_FIELD_IDS,
  SOCIAL_LINK_KEYS,
  SOCIAL_LINK_LABELS,
  socialLinkModesFromDraft,
  type SocialLinkKey,
  type SocialLinkMode,
  type SocialPlatform,
} from '@/features/dashboard/org/lib/propertySocialLinks';

export function PropertySocialsSection({
  data,
  draft,
  orgSocialLinks,
  disabled,
  resolveFieldError,
  markFieldInteracted,
  onChange,
  sectionMessages,
}: {
  data: Pick<AppSettingsDto, 'superhostProofImageUrl' | 'superhostStatus' | 'updatedAt'>;
  draft: AppSettingsFormValues;
  orgSocialLinks: OrgSocialLinks;
  disabled?: boolean;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  onChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
  sectionMessages: Partial<Record<PropertySettingsSectionId, string>>;
}) {
  const externalReviewsError = resolveFieldError('property-external-reviews');
  const superhostError = resolveFieldError('property-superhost-verification-url');
  const mainError = resolveFieldError('property-main-social-platform');

  const [socialLinkModes, setSocialLinkModes] = useState<Record<SocialLinkKey, SocialLinkMode>>(
    () => socialLinkModesFromDraft(draft)
  );

  useEffect(() => {
    setSocialLinkModes(socialLinkModesFromDraft(draft));
  }, [data.updatedAt]);

  const urls = useMemo(
    () => effectiveSocialUrlMapWithModes(draft, orgSocialLinks, socialLinkModes),
    [draft, orgSocialLinks, socialLinkModes]
  );

  const effectiveMain =
    effectiveMainSocialPlatform(
      draft.mainSocialPlatform,
      orgSocialLinks.mainSocialPlatform,
      urls
    ) ?? '';

  const setSocialLinkMode = (key: SocialLinkKey, mode: SocialLinkMode) => {
    setSocialLinkModes((current) => ({ ...current, [key]: mode }));
  };

  return (
    <AdminSection
      id="branding"
      title="Socials"
      icon={Share2}
      description="Social links, guest reviews, and Superhost proof."
    >
      {propertySettingsSectionBanner('branding', sectionMessages) ? (
        <PropertySettingsSectionAlert
          message={propertySettingsSectionBanner('branding', sectionMessages)!}
        />
      ) : null}

      <div className="space-y-4">
        <div className="border-border/60 divide-border/50 divide-y overflow-hidden rounded-xl border">
          {SOCIAL_LINK_KEYS.map((key) => (
            <SocialLinkInheritField
              key={key}
              id={SOCIAL_LINK_FIELD_IDS[key]}
              label={SOCIAL_LINK_LABELS[key]}
              storedValue={draft[key]}
              orgValue={orgSocialLinks[key]}
              inheritsOrg={socialLinkModes[key] === 'inherit'}
              disabled={disabled}
              error={resolveFieldError(SOCIAL_LINK_FIELD_IDS[key])}
              onStoredChange={(value) => {
                onChange(key, value);
                const platform = Object.entries(PLATFORM_TO_SOCIAL_LINK).find(
                  ([, linkKey]) => linkKey === key
                )?.[0] as SocialPlatform | undefined;
                if (
                  platform &&
                  !value.trim() &&
                  draft.mainSocialPlatform === platform &&
                  !orgSocialLinks[key].trim()
                ) {
                  onChange('mainSocialPlatform', '');
                }
              }}
              onInheritsOrgChange={(inherits) => {
                setSocialLinkMode(key, inherits ? 'inherit' : 'custom');
              }}
              onInteract={() => markFieldInteracted(SOCIAL_LINK_FIELD_IDS[key])}
            />
          ))}
        </div>

        <MainSocialPlatformPicker
          id="property-main-social-platform"
          value={effectiveMain}
          urls={urls}
          disabled={disabled}
          error={mainError}
          onChange={(platform) => onChange('mainSocialPlatform', platform)}
          onInteract={() => markFieldInteracted('property-main-social-platform')}
        />

        <PropertyExternalReviewsBlock
          reviews={draft.externalReviews}
          disabled={disabled}
          error={externalReviewsError}
          onReviewsChange={(reviews) => onChange('externalReviews', reviews)}
          onInteract={() => markFieldInteracted('property-external-reviews')}
        />

        <PropertySuperhostVerificationBlock
          verificationUrl={draft.superhostVerificationUrl}
          proofImageUrl={data.superhostProofImageUrl}
          status={data.superhostStatus as SuperhostStatus}
          disabled={disabled}
          error={superhostError}
          onVerificationUrlChange={(url) => onChange('superhostVerificationUrl', url)}
          onInteract={() => markFieldInteracted('property-superhost-verification-url')}
        />
      </div>
    </AdminSection>
  );
}

/** @deprecated Use PropertySocialsSection */
export const PropertySocialsBrandingSection = PropertySocialsSection;
