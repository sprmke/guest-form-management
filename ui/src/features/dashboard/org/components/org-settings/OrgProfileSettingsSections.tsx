import { Info, Share2 } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import {
  OrgSettingsField,
  OrgSettingsFieldGrid,
  OrgSettingsFieldSpan,
} from '@/features/dashboard/org/components/org-settings/OrgSettingsFields';
import { OrgSettingsImageField } from '@/features/dashboard/org/components/org-settings/OrgSettingsImageField';
import { RequiredMark } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { BrandColorField } from '@/features/dashboard/org/components/settings/BrandColorField';
import { type OrgSettingsFieldSource } from '@/features/dashboard/org/hooks/useOrgSettings';
import type { OrgSettingsDraft } from '@/features/dashboard/org/lib/orgSettingsForm';
import {
  ORG_DESCRIPTION_MAX_LENGTH,
  ORG_TAGLINE_MAX_LENGTH,
} from '@/features/dashboard/org/lib/orgSettingsValidation';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { DEFAULT_ORG_BRAND_COLOR } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

const DEFAULT_ORG_LOGO_URL = 'https://kamehomes.space/images/logo.png';

export function OrgBasicInformationSection({
  draft,
  disabled,
  orgUrlPrefix,
  slugPreview,
  logoSource,
  logoUrl,
  nameUnavailable,
  nameChecking,
  resolveFieldError,
  markFieldInteracted,
  onChange,
}: {
  draft: OrgSettingsDraft;
  disabled?: boolean;
  orgUrlPrefix: string;
  slugPreview: string;
  logoSource?: OrgSettingsFieldSource;
  logoUrl: string;
  nameUnavailable?: boolean;
  nameChecking?: boolean;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  onChange: <K extends keyof OrgSettingsDraft>(key: K, value: OrgSettingsDraft[K]) => void;
}) {
  const fieldError = resolveFieldError;
  const nameError = fieldError('org-name');
  const taglineError = fieldError('org-tagline');
  const descriptionError = fieldError('org-description');
  const brandColorError = fieldError('org-brand-color');

  const setBrandColor = (value: string) => {
    markFieldInteracted('org-brand-color');
    onChange('brandColor', value);
  };

  return (
    <AdminSection
      id="basic"
      title="Basic Information"
      icon={Info}
      description="Update your organization's fundamental details."
    >
      <OrgSettingsFieldGrid>
        <OrgSettingsFieldSpan>
          <OrgSettingsImageField
            id="org-logo"
            label="Organization logo"
            hint="This logo will appear on guest forms, emails, and invoices."
            source={logoSource}
            disabled={disabled}
            imageUrl={logoUrl || DEFAULT_ORG_LOGO_URL}
            previewAlt="Organization logo preview"
            uploadLabel="Upload logo"
            replaceLabel="Replace logo"
          />
        </OrgSettingsFieldSpan>

        <OrgSettingsFieldSpan>
          <OrgSettingsField id="org-name" label="Organization name" required>
            <Input
              id="org-name"
              value={draft.name}
              onChange={(event) => {
                markFieldInteracted('org-name');
                onChange('name', event.target.value);
              }}
              disabled={disabled}
              required
              placeholder="Enter organization name"
              className={cn('h-10', (nameUnavailable || nameError) && 'border-destructive')}
              maxLength={120}
              aria-invalid={Boolean(nameUnavailable || nameError)}
            />
            {nameUnavailable ? (
              <p className="text-destructive text-xs">
                An organization with this name already exists.
              </p>
            ) : nameError ? (
              <p className="text-destructive text-xs">{nameError}</p>
            ) : nameChecking ? (
              <p className="text-muted-foreground text-xs">Checking availability…</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                This is the name displayed to your team and in reports.
              </p>
            )}
          </OrgSettingsField>
        </OrgSettingsFieldSpan>

        <OrgSettingsFieldSpan>
          <OrgSettingsField id="org-slug" label="URL slug">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-muted-foreground truncate text-sm">{orgUrlPrefix}</span>
              <Input
                id="org-slug"
                value={slugPreview}
                readOnly
                disabled={disabled}
                className="bg-muted/40 h-10 sm:max-w-xs"
                autoComplete="off"
                spellCheck={false}
                aria-readonly="true"
              />
            </div>
          </OrgSettingsField>
        </OrgSettingsFieldSpan>

        <OrgSettingsFieldSpan>
          <BrandColorField
            id="org-brand-color"
            layout="org"
            value={draft.brandColor}
            resolvedColor={DEFAULT_ORG_BRAND_COLOR}
            disabled={disabled}
            error={brandColorError}
            hint="Tints org dashboard pages (org selector, org settings, org properties)."
            onChange={setBrandColor}
          />
        </OrgSettingsFieldSpan>

        <OrgSettingsFieldSpan>
          <OrgSettingsField id="org-tagline" label="Tagline" error={taglineError}>
            <Input
              id="org-tagline"
              value={draft.tagline}
              onChange={(event) => {
                markFieldInteracted('org-tagline');
                onChange('tagline', event.target.value);
              }}
              disabled={disabled}
              placeholder="A short tagline for your organization"
              className={cn('h-10', taglineError && 'border-destructive')}
              maxLength={ORG_TAGLINE_MAX_LENGTH}
              aria-invalid={Boolean(taglineError)}
            />
            {!taglineError ? (
              <p className="text-muted-foreground text-xs">
                {draft.tagline.length}/{ORG_TAGLINE_MAX_LENGTH} characters
              </p>
            ) : null}
          </OrgSettingsField>
        </OrgSettingsFieldSpan>

        <OrgSettingsFieldSpan>
          <OrgSettingsField id="org-description" label="Description" error={descriptionError}>
            <Textarea
              id="org-description"
              value={draft.description}
              onChange={(event) => {
                markFieldInteracted('org-description');
                onChange('description', event.target.value);
              }}
              disabled={disabled}
              placeholder="Brief description of your organization"
              rows={8}
              maxLength={ORG_DESCRIPTION_MAX_LENGTH}
              aria-invalid={Boolean(descriptionError)}
              className={cn(descriptionError && 'border-destructive')}
            />
            {!descriptionError ? (
              <p className="text-muted-foreground text-xs">
                {draft.description.length}/{ORG_DESCRIPTION_MAX_LENGTH} characters
              </p>
            ) : null}
          </OrgSettingsField>
        </OrgSettingsFieldSpan>
      </OrgSettingsFieldGrid>
    </AdminSection>
  );
}

const SOCIAL_LINK_FIELDS = [
  {
    id: 'facebook-page-url',
    key: 'facebookPageUrl' as const,
    label: 'Facebook',
    placeholder: FORM_PLACEHOLDERS.facebookPage,
    required: true,
  },
  {
    id: 'airbnb-url',
    key: 'airbnbUrl' as const,
    label: 'Airbnb',
    placeholder: FORM_PLACEHOLDERS.airbnbListing,
    required: false,
  },
  {
    id: 'instagram-url',
    key: 'instagramUrl' as const,
    label: 'Instagram',
    placeholder: FORM_PLACEHOLDERS.instagramProfile,
    required: false,
  },
  {
    id: 'tiktok-url',
    key: 'tiktokUrl' as const,
    label: 'TikTok',
    placeholder: FORM_PLACEHOLDERS.tiktokProfile,
    required: false,
  },
] as const;

export function OrgSocialsSection({
  operatorDraft,
  disabled,
  resolveFieldError,
  markFieldInteracted,
  onOperatorChange,
}: {
  operatorDraft: {
    facebookPageUrl: string;
    airbnbUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
  };
  disabled?: boolean;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  onOperatorChange: (
    key: 'facebookPageUrl' | 'airbnbUrl' | 'instagramUrl' | 'tiktokUrl',
    value: string
  ) => void;
}) {
  const fieldError = resolveFieldError;

  return (
    <AdminSection id="branding" title="Socials" icon={Share2}>
      <OrgSettingsFieldGrid>
        <OrgSettingsFieldSpan>
          <div className="border-border/60 divide-border/50 divide-y overflow-hidden rounded-xl border">
            {SOCIAL_LINK_FIELDS.map((field) => {
              const socialError = fieldError(field.id);
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
                      value={operatorDraft[field.key]}
                      onChange={(event) => {
                        markFieldInteracted(field.id);
                        onOperatorChange(field.key, event.target.value);
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
        </OrgSettingsFieldSpan>
      </OrgSettingsFieldGrid>
    </AdminSection>
  );
}

/** @deprecated Use OrgSocialsSection */
export const OrgSocialsBrandingSection = OrgSocialsSection;
