import { Share2 } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type {
  AppSettingsDto,
  AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyExternalReviewsBlock } from '@/features/dashboard/org/components/property-settings/PropertyExternalReviewsBlock';
import { PropertySettingsSectionAlert } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { PropertySuperhostVerificationBlock } from '@/features/dashboard/org/components/property-settings/PropertySuperhostVerificationBlock';
import { SocialLinkInheritField } from '@/features/dashboard/org/components/settings/SocialLinkInheritField';
import type { SuperhostStatus } from '@/features/dashboard/org/lib/propertyExternalReviews';
import type { PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import type { OrgSocialLinks } from '@/features/dashboard/org/lib/propertySocialLinks';
import {
  allPropertySocialLinksInherit,
  anyPropertySocialLinkCustom,
  SOCIAL_LINK_FIELD_IDS,
  SOCIAL_LINK_KEYS,
} from '@/features/dashboard/org/lib/propertySocialLinks';
import { propertySettingsSectionBanner } from '@/features/dashboard/org/lib/propertySettingsFieldError';

import { Button } from '@/components/ui/button';

const SOCIAL_LINK_LABELS: Record<(typeof SOCIAL_LINK_KEYS)[number], string> = {
  facebookPageUrl: 'Facebook',
  airbnbUrl: 'Airbnb',
  instagramUrl: 'Instagram',
  tiktokUrl: 'TikTok',
};

const SOCIAL_LINK_REQUIRED: Record<(typeof SOCIAL_LINK_KEYS)[number], boolean> = {
  facebookPageUrl: true,
  airbnbUrl: false,
  instagramUrl: false,
  tiktokUrl: false,
};

export function PropertySocialsSection({
  data,
  draft,
  orgSocialLinks,
  orgName,
  orgSettingsHref,
  disabled,
  resolveFieldError,
  markFieldInteracted,
  onChange,
  sectionMessages,
}: {
  data: Pick<AppSettingsDto, 'superhostProofImageUrl' | 'superhostStatus'>;
  draft: AppSettingsFormValues;
  orgSocialLinks: OrgSocialLinks;
  orgName: string;
  orgSettingsHref: string;
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
  const allInherit = allPropertySocialLinksInherit(draft);
  const anyCustom = anyPropertySocialLinkCustom(draft);

  const inheritAll = () => {
    for (const key of SOCIAL_LINK_KEYS) {
      if (draft[key].trim()) {
        onChange(key, '');
      }
    }
  };

  const customizeAll = () => {
    for (const key of SOCIAL_LINK_KEYS) {
      if (!draft[key].trim()) {
        onChange(key, orgSocialLinks[key].trim());
      }
    }
  };

  return (
    <AdminSection id="branding" title="Socials" icon={Share2}>
      {propertySettingsSectionBanner('branding', sectionMessages) ? (
        <PropertySettingsSectionAlert
          message={propertySettingsSectionBanner('branding', sectionMessages)!}
        />
      ) : null}

      <div className="space-y-3">
        {anyCustom ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="min-h-[44px] w-full sm:w-auto"
              onClick={inheritAll}
            >
              Use organization for all
            </Button>
          </div>
        ) : null}
        {allInherit ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="min-h-[44px] w-full sm:w-auto"
              onClick={customizeAll}
            >
              Customize links
            </Button>
          </div>
        ) : null}

        <div className="border-border/60 divide-border/50 divide-y overflow-hidden rounded-xl border">
          {SOCIAL_LINK_KEYS.map((key) => (
            <SocialLinkInheritField
              key={key}
              id={SOCIAL_LINK_FIELD_IDS[key]}
              label={SOCIAL_LINK_LABELS[key]}
              required={SOCIAL_LINK_REQUIRED[key]}
              storedValue={draft[key]}
              orgValue={orgSocialLinks[key]}
              orgName={orgName}
              orgSettingsHref={orgSettingsHref}
              disabled={disabled}
              error={resolveFieldError(SOCIAL_LINK_FIELD_IDS[key])}
              onStoredChange={(value) => onChange(key, value)}
              onInteract={() => markFieldInteracted(SOCIAL_LINK_FIELD_IDS[key])}
            />
          ))}
        </div>

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
