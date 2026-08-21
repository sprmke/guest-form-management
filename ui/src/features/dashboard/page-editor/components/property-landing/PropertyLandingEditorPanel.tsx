import { StyleSection } from '@/features/dashboard/marketing/components/calendar-builder/components/panels/StyleSection';
import { SectionOrderList } from '@/features/dashboard/page-editor/components/controls/SectionOrderList';
import { PropertyLandingAmenitiesControl } from '@/features/dashboard/page-editor/components/property-landing/PropertyLandingAmenitiesControl';
import { PropertyLandingHouseRulesControl } from '@/features/dashboard/page-editor/components/property-landing/PropertyLandingHouseRulesControl';
import { PropertyMediaUpload } from '@/features/dashboard/org/components/property-settings/PropertyMediaUpload';
import { usePropertyLandingEditorStore } from '@/features/dashboard/page-editor/stores/propertyLandingEditorStore';
import type {
  AppSettingsDto,
  AppSettingsFormValues,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { PropertyCancellationPolicySection } from '@/features/dashboard/org/components/property-settings/PropertyCancellationPolicySection';
import { PropertySocialsSection } from '@/features/dashboard/org/components/property-settings/PropertySocialsBrandingSection';
import { BrandColorField } from '@/features/dashboard/org/components/settings/BrandColorField';
import type { CancellationPolicySettings } from '@/features/dashboard/org/lib/propertyCancellationPolicy';
import type { CustomHouseRule } from '@/features/dashboard/org/lib/propertyHouseRulesConstants';
import type {
  CustomAmenity,
  PropertyMediaItem,
} from '@/features/dashboard/org/lib/propertySettingsConstants';
import type { PropertyExternalReview } from '@/features/dashboard/org/lib/propertyExternalReviews';
import type { OrgSocialLinks } from '@/features/dashboard/org/lib/propertySocialLinks';
import type { PropertyLandingSectionId } from '@/features/guest/marketing/properties/types/publicProperty';

import { Textarea } from '@/components/ui/textarea';

const SECTION_LABELS: Record<PropertyLandingSectionId, string> = {
  gallery: 'Gallery',
  overview: 'Overview',
  amenities: 'Amenities',
  location: 'Location',
  rules: 'House rules',
  reviews: 'Reviews',
};

export type LandingProfileContent = {
  description: string;
  enabledAmenities: string[];
  customAmenities: CustomAmenity[];
  enabledHouseRules: string[];
  customHouseRules: CustomHouseRule[];
  cancellationPolicy: CancellationPolicySettings;
};

type Props = {
  media: PropertyMediaItem[];
  onMediaChange: (media: PropertyMediaItem[]) => void;
  onMediaPersisted: (media: PropertyMediaItem[]) => void;
  onPersistMediaOrder: (media: PropertyMediaItem[]) => Promise<void>;
  mediaBusy?: boolean;
  brandColor: string;
  inheritedBrandColor: string;
  onBrandColorChange: (value: string) => void;
  brandColorError?: string | null;
  content: LandingProfileContent;
  onContentChange: <K extends keyof LandingProfileContent>(
    key: K,
    value: LandingProfileContent[K]
  ) => void;
  socialDraft: AppSettingsFormValues;
  socialBaselineReviews: PropertyExternalReview[];
  appSettings: Pick<AppSettingsDto, 'superhostProofImageUrl' | 'superhostStatus' | 'updatedAt'>;
  orgSocialLinks: OrgSocialLinks;
  onSocialChange: <K extends keyof AppSettingsFormValues>(
    key: K,
    value: AppSettingsFormValues[K]
  ) => void;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  onSaveReview?: (reviewId: string) => void;
  savingReviewId?: string | null;
};

export function PropertyLandingEditorPanel({
  media,
  onMediaChange,
  onMediaPersisted,
  onPersistMediaOrder,
  mediaBusy = false,
  brandColor,
  inheritedBrandColor,
  onBrandColorChange,
  brandColorError = null,
  content,
  onContentChange,
  socialDraft,
  socialBaselineReviews,
  appSettings,
  orgSocialLinks,
  onSocialChange,
  resolveFieldError,
  markFieldInteracted,
  onSaveReview,
  savingReviewId,
}: Props) {
  const config = usePropertyLandingEditorStore((s) => s.config);
  const setSectionVisible = usePropertyLandingEditorStore((s) => s.setSectionVisible);
  const reorderSections = usePropertyLandingEditorStore((s) => s.reorderSections);

  const orderedSections = [...config.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-w-0">
      <StyleSection title="Sections" defaultOpen>
        <SectionOrderList
          items={orderedSections.map((section) => ({
            id: section.id,
            label: SECTION_LABELS[section.id],
            visible: section.visible,
          }))}
          onReorder={(ids) => reorderSections(ids as PropertyLandingSectionId[])}
          onVisibilityChange={(id, visible) =>
            setSectionVisible(id as PropertyLandingSectionId, visible)
          }
        />
      </StyleSection>

      <StyleSection title="Gallery" defaultOpen>
        <div className="px-4 py-3">
          <PropertyMediaUpload
            items={media}
            onChange={onMediaChange}
            onPersisted={onMediaPersisted}
            onPersistOrder={onPersistMediaOrder}
            disabled={mediaBusy}
          />
        </div>
      </StyleSection>

      <StyleSection title="Brand color" defaultOpen>
        <div className="px-4 py-3">
          <BrandColorField
            id="landing-brand-color"
            value={brandColor}
            resolvedColor={inheritedBrandColor}
            resetValue={inheritedBrandColor}
            error={brandColorError}
            hideLabel
            onChange={onBrandColorChange}
          />
        </div>
      </StyleSection>

      <StyleSection title="Description" defaultOpen>
        <div className="space-y-2 px-4 py-3">
          <Textarea
            id="landing-description"
            value={content.description}
            onChange={(event) => onContentChange('description', event.target.value)}
            placeholder="Describe your property..."
            rows={8}
            maxLength={1000}
          />
          <p className="text-muted-foreground text-xs">{content.description.length}/1000</p>
        </div>
      </StyleSection>

      <StyleSection title="Amenities">
        <PropertyLandingAmenitiesControl
          enabledAmenities={content.enabledAmenities}
          customAmenities={content.customAmenities}
          onEnabledChange={(ids) => onContentChange('enabledAmenities', ids)}
          onCustomChange={(amenities) => onContentChange('customAmenities', amenities)}
        />
      </StyleSection>

      <StyleSection title="House rules">
        <PropertyLandingHouseRulesControl
          enabledHouseRules={content.enabledHouseRules}
          customHouseRules={content.customHouseRules}
          onEnabledChange={(ids) => onContentChange('enabledHouseRules', ids)}
          onCustomChange={(rules) => onContentChange('customHouseRules', rules)}
        />
      </StyleSection>

      <StyleSection title="Cancellation">
        <PropertyCancellationPolicySection
          embedded
          policy={content.cancellationPolicy}
          resolveFieldError={resolveFieldError}
          markFieldInteracted={markFieldInteracted}
          onChange={(policy) => onContentChange('cancellationPolicy', policy)}
        />
      </StyleSection>

      <StyleSection title="Socials">
        <PropertySocialsSection
          embedded
          data={appSettings}
          draft={socialDraft}
          externalReviewsBaseline={socialBaselineReviews}
          orgSocialLinks={orgSocialLinks}
          resolveFieldError={resolveFieldError}
          markFieldInteracted={markFieldInteracted}
          onChange={onSocialChange}
          sectionMessages={{}}
          onSaveReview={onSaveReview}
          savingReviewId={savingReviewId}
        />
      </StyleSection>
    </div>
  );
}
