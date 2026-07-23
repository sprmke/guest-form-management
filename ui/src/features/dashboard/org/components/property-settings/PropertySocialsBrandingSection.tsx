import { Share2 } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type {
  AppSettingsDto,
  AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyExternalReviewsBlock } from '@/features/dashboard/org/components/property-settings/PropertyExternalReviewsBlock';
import {
  PropertySettingsSectionAlert,
  RequiredMark,
} from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { PropertySuperhostVerificationBlock } from '@/features/dashboard/org/components/property-settings/PropertySuperhostVerificationBlock';
import type { SuperhostStatus } from '@/features/dashboard/org/lib/propertyExternalReviews';
import type { PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { propertySettingsSectionBanner } from '@/features/dashboard/org/lib/propertySettingsFieldError';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

const SOCIAL_LINK_FIELDS = [
  {
    id: 'property-airbnb-url',
    key: 'airbnbUrl' as const,
    label: 'Airbnb',
    placeholder: FORM_PLACEHOLDERS.airbnbListing,
    required: false,
  },
  {
    id: 'property-facebook-page-url',
    key: 'facebookPageUrl' as const,
    label: 'Facebook',
    placeholder: FORM_PLACEHOLDERS.facebookPage,
    required: true,
  },
  {
    id: 'property-instagram-url',
    key: 'instagramUrl' as const,
    label: 'Instagram',
    placeholder: FORM_PLACEHOLDERS.instagramProfile,
    required: false,
  },
  {
    id: 'property-tiktok-url',
    key: 'tiktokUrl' as const,
    label: 'TikTok',
    placeholder: FORM_PLACEHOLDERS.tiktokProfile,
    required: false,
  },
] as const;

export function PropertySocialsSection({
  data,
  draft,
  disabled,
  resolveFieldError,
  markFieldInteracted,
  onChange,
  sectionMessages,
}: {
  data: Pick<AppSettingsDto, 'superhostProofImageUrl' | 'superhostStatus'>;
  draft: AppSettingsFormValues;
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

  return (
    <AdminSection id="branding" title="Socials" icon={Share2}>
      {propertySettingsSectionBanner('branding', sectionMessages) ? (
        <PropertySettingsSectionAlert
          message={propertySettingsSectionBanner('branding', sectionMessages)!}
        />
      ) : null}

      <div className="space-y-3">
        <div className="border-border/60 divide-border/50 divide-y overflow-hidden rounded-xl border">
          {SOCIAL_LINK_FIELDS.map((field) => {
            const socialError = resolveFieldError(field.id);
            return (
              <div
                key={field.id}
                className="bg-card flex flex-col gap-2 p-3 sm:grid sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start sm:gap-4"
              >
                <Label htmlFor={field.id} className="text-sm font-medium leading-none sm:pt-2.5">
                  {field.label}
                  {field.required ? <RequiredMark /> : null}
                </Label>
                <div className="min-w-0 space-y-1">
                  <Input
                    id={field.id}
                    type="url"
                    disabled={disabled}
                    value={draft[field.key]}
                    onChange={(event) => {
                      markFieldInteracted(field.id);
                      onChange(field.key, event.target.value);
                    }}
                    className={cn('h-10 min-w-0', socialError && 'border-destructive')}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(socialError)}
                  />
                  {socialError ? <p className="text-destructive text-xs">{socialError}</p> : null}
                </div>
              </div>
            );
          })}
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
