import { useState } from 'react';

import {
  AlertTriangle,
  Baby,
  Bath,
  Bed,
  ChevronRight,
  Home,
  Image as ImageIcon,
  Info,
  ListChecks,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { PropertyCancellationPolicySection } from '@/features/dashboard/org/components/property-settings/PropertyCancellationPolicySection';
import { PropertyLocationPicker } from '@/features/dashboard/org/components/property-settings/PropertyLocationPicker';
import { PropertyMediaUpload } from '@/features/dashboard/org/components/property-settings/PropertyMediaUpload';
import {
  PropertySettingsSectionAlert,
  SettingsField,
  LimitedCountInput,
} from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { BrandColorField } from '@/features/dashboard/org/components/settings/BrandColorField';
import { TowerUnitConflictAlert } from '@/features/dashboard/org/components/TowerUnitConflictAlert';
import { DEFAULT_RESIDENCE_NAME } from '@/features/dashboard/org/lib/propertyDisplay';
import { applyResidenceLocationDefaultsToDraft } from '@/features/dashboard/org/lib/propertyLocation';
import {
  HOUSE_RULE_CATEGORIES,
  HOUSE_RULE_CUSTOM_MAX_LENGTH,
  MUTUALLY_EXCLUSIVE_HOUSE_RULES,
  type CustomHouseRule,
} from '@/features/dashboard/org/lib/propertyHouseRulesConstants';
import {
  applyResidenceDefaultsToDraft,
  clampToRange,
  getResidencePropertyDefaults,
} from '@/features/dashboard/org/lib/propertyResidenceDefaults';
import {
  getPropertyResidenceNames,
  getTowersForResidence,
  isCondoPropertyType,
  isKnownResidence,
  isTowerInResidence,
} from '@/features/dashboard/org/lib/propertyResidences';
import { type PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import {
  AMENITY_CATEGORIES,
  CUSTOM_AMENITY_MAX_LENGTH,
  PROPERTY_CONTACT_ROLES,
  PROPERTY_TYPES,
  type CustomAmenity,
  type PropertyMediaItem,
} from '@/features/dashboard/org/lib/propertySettingsConstants';
import { propertySettingsSectionBanner } from '@/features/dashboard/org/lib/propertySettingsFieldError';
import {
  propertyGuestCapacityTotal,
  type PropertyProfileDraft,
} from '@/features/dashboard/org/lib/propertySettingsForm';
import {
  isValidUnitNumber,
  sanitizeUnitNumberInput,
  type PropertyTower,
} from '@/features/dashboard/org/lib/propertyTowerUnit';
import type { PropertyTowerUnitConflict } from '@/features/dashboard/org/lib/propertyTowerUnitConflict';

import { Button } from '@/components/ui/button';
import { Checkbox, CheckboxDisplay } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import { cn } from '@/lib/utils';

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">{children}</div>;
}

function SectionDivider() {
  return <div className="border-border border-t" />;
}

type ProfileSectionsProps = {
  draft: PropertyProfileDraft;
  onChange: <K extends keyof PropertyProfileDraft>(key: K, value: PropertyProfileDraft[K]) => void;
  disabled?: boolean;
  propertySlugPrefix: string;
  slugPreview: string;
  towerConflict: PropertyTowerUnitConflict | null;
  nameUnavailable?: boolean;
  nameChecking?: boolean;
  newCustomAmenityInputs: Record<string, string>;
  onNewCustomAmenityInputChange: (categoryId: string, value: string) => void;
  newCustomHouseRuleInputs: Record<string, string>;
  onNewCustomHouseRuleInputChange: (categoryId: string, value: string) => void;
  onMediaPersisted?: (media: PropertyMediaItem[]) => void;
  onPersistMediaOrder?: (media: PropertyMediaItem[]) => Promise<void>;
  mediaGalleryBusy?: boolean;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  sectionMessages?: Partial<Record<PropertySettingsSectionId, string>>;
  brandColor: string;
  inheritedBrandColor: string;
  onBrandColorChange: (value: string) => void;
};

export function PropertyProfileMainSections({
  draft,
  onChange,
  disabled = false,
  propertySlugPrefix,
  slugPreview,
  towerConflict,
  nameUnavailable = false,
  nameChecking = false,
  newCustomAmenityInputs,
  onNewCustomAmenityInputChange,
  newCustomHouseRuleInputs,
  onNewCustomHouseRuleInputChange,
  onMediaPersisted,
  onPersistMediaOrder,
  mediaGalleryBusy = false,
  resolveFieldError,
  markFieldInteracted,
  sectionMessages = {},
  brandColor,
  inheritedBrandColor,
  onBrandColorChange,
}: ProfileSectionsProps) {
  const fieldError = resolveFieldError;

  const setField = <K extends keyof PropertyProfileDraft>(
    key: K,
    value: PropertyProfileDraft[K],
    fieldId: string
  ) => {
    markFieldInteracted(fieldId);
    onChange(key, value);
  };
  const isCondo = isCondoPropertyType(draft.type);
  const effectiveResidence = draft.residenceName.trim() || DEFAULT_RESIDENCE_NAME;
  const residenceOptions = getPropertyResidenceNames();
  const towerOptions = isCondo ? getTowersForResidence(effectiveResidence) : [];
  const towerValid =
    isCondo && Boolean(draft.tower) && isTowerInResidence(draft.tower, effectiveResidence);
  const towerUnitReady = towerValid && isValidUnitNumber(draft.unitNumber);
  const hasDuplicate = towerUnitReady && towerConflict !== null;

  const handleTypeChange = (value: string) => {
    markFieldInteracted('property-type');
    onChange('type', value);
    if (isCondoPropertyType(value) && !draft.residenceName.trim()) {
      onChange('residenceName', DEFAULT_RESIDENCE_NAME);
      const locationDefaults = applyResidenceLocationDefaultsToDraft(DEFAULT_RESIDENCE_NAME, draft);
      (
        Object.entries(locationDefaults) as [
          keyof PropertyProfileDraft,
          PropertyProfileDraft[keyof PropertyProfileDraft],
        ][]
      ).forEach(([key, fieldValue]) => onChange(key, fieldValue));
    }
  };

  const handleResidenceChange = (value: string) => {
    markFieldInteracted('property-residence');
    if (draft.tower && !isTowerInResidence(draft.tower, value)) {
      onChange('tower', '');
    }
    onChange('residenceName', value);
    if (isKnownResidence(value)) {
      const defaults = applyResidenceDefaultsToDraft(value);
      (
        Object.entries(defaults) as [
          keyof PropertyProfileDraft,
          PropertyProfileDraft[keyof PropertyProfileDraft],
        ][]
      ).forEach(([key, fieldValue]) => onChange(key, fieldValue));
    }
    const locationDefaults = applyResidenceLocationDefaultsToDraft(value, draft);
    (
      Object.entries(locationDefaults) as [
        keyof PropertyProfileDraft,
        PropertyProfileDraft[keyof PropertyProfileDraft],
      ][]
    ).forEach(([key, fieldValue]) => onChange(key, fieldValue));
  };

  const handleMaxAdultsChange = (value: number) => {
    markFieldInteracted('property-max-adults');
    const maxAdults = Math.max(0, value);
    onChange('maxAdults', maxAdults);
    onChange('maxGuests', propertyGuestCapacityTotal(maxAdults, draft.maxChildren));
  };

  const handleMaxChildrenChange = (value: number) => {
    markFieldInteracted('property-max-children');
    const maxChildren = Math.max(0, value);
    onChange('maxChildren', maxChildren);
    onChange('maxGuests', propertyGuestCapacityTotal(draft.maxAdults, maxChildren));
  };

  const totalGuests = propertyGuestCapacityTotal(draft.maxAdults, draft.maxChildren);

  const residenceDefaults = getResidencePropertyDefaults(effectiveResidence);

  const toggleAmenity = (amenityId: string) => {
    const next = draft.enabledAmenities.includes(amenityId)
      ? draft.enabledAmenities.filter((id) => id !== amenityId)
      : [...draft.enabledAmenities, amenityId];
    onChange('enabledAmenities', next);
  };

  const addCustomAmenity = (categoryId: string) => {
    const name = newCustomAmenityInputs[categoryId]?.trim();
    if (!name) return;
    if (name.length > CUSTOM_AMENITY_MAX_LENGTH) {
      toast.error(`Custom amenities must be ${CUSTOM_AMENITY_MAX_LENGTH} characters or fewer`);
      return;
    }
    const amenity: CustomAmenity = {
      id: `custom_${categoryId}_${Date.now()}`,
      name,
      categoryId,
    };
    onChange('customAmenities', [...draft.customAmenities, amenity]);
    onChange('enabledAmenities', [...draft.enabledAmenities, amenity.id]);
    onNewCustomAmenityInputChange(categoryId, '');
  };

  const removeCustomAmenity = (amenityId: string) => {
    onChange(
      'customAmenities',
      draft.customAmenities.filter((entry) => entry.id !== amenityId)
    );
    onChange(
      'enabledAmenities',
      draft.enabledAmenities.filter((id) => id !== amenityId)
    );
  };

  const getCustomAmenitiesForCategory = (categoryId: string) =>
    draft.customAmenities.filter((entry) => entry.categoryId === categoryId);

  const toggleHouseRule = (ruleId: string) => {
    const enabled = draft.enabledHouseRules.includes(ruleId);
    let next = enabled
      ? draft.enabledHouseRules.filter((id) => id !== ruleId)
      : [...draft.enabledHouseRules, ruleId];

    const exclusiveId = MUTUALLY_EXCLUSIVE_HOUSE_RULES[ruleId];
    if (!enabled && exclusiveId) {
      next = next.filter((id) => id !== exclusiveId);
    }

    onChange('enabledHouseRules', next);
  };

  const addCustomHouseRule = (categoryId: string) => {
    const name = newCustomHouseRuleInputs[categoryId]?.trim();
    if (!name) return;
    if (name.length > HOUSE_RULE_CUSTOM_MAX_LENGTH) {
      toast.error(`Custom rules must be ${HOUSE_RULE_CUSTOM_MAX_LENGTH} characters or fewer`);
      return;
    }
    const rule: CustomHouseRule = {
      id: `custom_${categoryId}_${Date.now()}`,
      name,
      categoryId,
    };
    onChange('customHouseRules', [...draft.customHouseRules, rule]);
    onChange('enabledHouseRules', [...draft.enabledHouseRules, rule.id]);
    onNewCustomHouseRuleInputChange(categoryId, '');
  };

  const removeCustomHouseRule = (ruleId: string) => {
    onChange(
      'customHouseRules',
      draft.customHouseRules.filter((entry) => entry.id !== ruleId)
    );
    onChange(
      'enabledHouseRules',
      draft.enabledHouseRules.filter((id) => id !== ruleId)
    );
  };

  const getCustomHouseRulesForCategory = (categoryId: string) =>
    draft.customHouseRules.filter((entry) => entry.categoryId === categoryId);

  return (
    <>
      <AdminSection
        id="basic"
        title="Basic Information"
        icon={Info}
        description="Update your property's fundamental details."
      >
        <SettingsField
          id="property-name"
          label="Property Name"
          required
          error={
            fieldError('property-name') ??
            (nameUnavailable ? 'A property with this name already exists' : null)
          }
          hintBelow={
            !fieldError('property-name') && !nameUnavailable && !nameChecking
              ? 'This is the name guests will see when searching for your property.'
              : nameChecking
                ? 'Checking availability…'
                : undefined
          }
        >
          <Input
            id="property-name"
            value={draft.name}
            onChange={(event) => setField('name', event.target.value, 'property-name')}
            disabled={disabled}
            placeholder="Enter property name"
            maxLength={120}
            aria-invalid={Boolean(fieldError('property-name') || nameUnavailable)}
            className={cn((fieldError('property-name') || nameUnavailable) && 'border-destructive')}
          />
        </SettingsField>

        <SettingsField id="property-slug" label="URL Slug">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-muted-foreground truncate text-sm">{propertySlugPrefix}</span>
            <Input
              id="property-slug"
              value={slugPreview}
              readOnly
              disabled={disabled}
              placeholder="property-slug"
              className="bg-muted/40 max-w-xs"
              autoComplete="off"
              spellCheck={false}
              aria-readonly="true"
            />
          </div>
        </SettingsField>

        <BrandColorField
          id="property-brand-color"
          value={brandColor}
          resolvedColor={inheritedBrandColor}
          resetValue={inheritedBrandColor}
          disabled={disabled}
          error={fieldError('property-brand-color')}
          hint="Tints this property's admin pages, guest forms, emails, and accents."
          onChange={(value) => {
            markFieldInteracted('property-brand-color');
            onBrandColorChange(value);
          }}
        />

        <FieldGrid>
          <SettingsField
            id="property-type"
            label="Property Type"
            required
            error={fieldError('property-type')}
          >
            <Select value={draft.type} onValueChange={handleTypeChange} disabled={disabled}>
              <SelectTrigger
                id="property-type"
                aria-invalid={Boolean(fieldError('property-type'))}
                className={cn(fieldError('property-type') && 'border-destructive')}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent position="popper">
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>

          {isCondo ? (
            <SettingsField
              id="property-residence"
              label="Residence"
              required
              error={fieldError('property-residence')}
            >
              <Select
                value={draft.residenceName.trim() || residenceOptions[0] || undefined}
                onValueChange={handleResidenceChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id="property-residence"
                  aria-invalid={Boolean(fieldError('property-residence'))}
                  className={cn(fieldError('property-residence') && 'border-destructive')}
                >
                  <SelectValue placeholder="Select residence" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {residenceOptions.map((residence) => (
                    <SelectItem key={residence} value={residence}>
                      {residence}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
          ) : null}

          {isCondo ? (
            <>
              <SettingsField
                id="property-tower"
                label="Tower"
                required
                error={fieldError('property-tower')}
              >
                <Select
                  value={draft.tower || undefined}
                  onValueChange={(value) =>
                    setField('tower', value as PropertyTower, 'property-tower')
                  }
                  disabled={disabled || towerOptions.length === 0}
                >
                  <SelectTrigger
                    id="property-tower"
                    aria-invalid={Boolean(fieldError('property-tower') || hasDuplicate)}
                    className={cn(
                      (fieldError('property-tower') || hasDuplicate) && 'border-destructive'
                    )}
                  >
                    <SelectValue placeholder="Select tower" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {towerOptions.map((tower) => (
                      <SelectItem key={tower} value={tower}>
                        {tower}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>

              <SettingsField
                id="property-unit"
                label="Unit"
                required
                error={fieldError('property-unit')}
              >
                <Input
                  id="property-unit"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.unitNumber}
                  onChange={(event) =>
                    setField(
                      'unitNumber',
                      sanitizeUnitNumberInput(event.target.value),
                      'property-unit'
                    )
                  }
                  disabled={disabled}
                  placeholder={FORM_PLACEHOLDERS.unitNumber}
                  maxLength={4}
                  aria-invalid={Boolean(fieldError('property-unit') || hasDuplicate)}
                  className={cn(
                    'tabular-nums',
                    (fieldError('property-unit') || hasDuplicate) && 'border-destructive'
                  )}
                />
              </SettingsField>
            </>
          ) : null}
        </FieldGrid>

        {isCondo && towerUnitReady && hasDuplicate && towerConflict ? (
          <TowerUnitConflictAlert
            tower={draft.tower}
            unitNumber={draft.unitNumber}
            conflict={towerConflict}
          />
        ) : null}

        <SettingsField id="property-description" label="Description">
          <Textarea
            id="property-description"
            value={draft.description}
            onChange={(event) => onChange('description', event.target.value)}
            disabled={disabled}
            placeholder="Describe your property..."
            rows={12}
            maxLength={1000}
          />
          <p className="text-muted-foreground text-xs">
            {draft.description.length}/1000 characters
          </p>
        </SettingsField>
      </AdminSection>

      <AdminSection
        id="media"
        title="Photos & Videos"
        icon={ImageIcon}
        description="Showcase your property with high-quality images and videos."
      >
        {propertySettingsSectionBanner('media', sectionMessages) ? (
          <PropertySettingsSectionAlert
            message={propertySettingsSectionBanner('media', sectionMessages)!}
          />
        ) : null}
        <PropertyMediaUpload
          items={draft.media}
          onChange={(media) => onChange('media', media)}
          onPersisted={onMediaPersisted}
          onPersistOrder={onPersistMediaOrder}
          disabled={disabled || mediaGalleryBusy}
        />
      </AdminSection>

      <AdminSection
        id="details"
        title="Property Details"
        icon={Home}
        description="Specify the capacity and features of your property."
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SettingsField
            id="property-bedrooms"
            label="Bedrooms"
            required
            error={fieldError('property-bedrooms')}
          >
            <div className="relative">
              <Bed
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="property-bedrooms"
                type="number"
                min={residenceDefaults.bedrooms.min}
                max={residenceDefaults.bedrooms.max}
                value={draft.bedrooms}
                onChange={(event) =>
                  setField(
                    'bedrooms',
                    clampToRange(Number(event.target.value), residenceDefaults.bedrooms),
                    'property-bedrooms'
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(fieldError('property-bedrooms'))}
                className={cn('pl-9', fieldError('property-bedrooms') && 'border-destructive')}
              />
            </div>
          </SettingsField>

          <SettingsField
            id="property-bathrooms"
            label="Bathrooms"
            required
            error={fieldError('property-bathrooms')}
          >
            <div className="relative">
              <Bath
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="property-bathrooms"
                type="number"
                min={residenceDefaults.bathrooms.min}
                max={residenceDefaults.bathrooms.max}
                step={0.5}
                value={draft.bathrooms}
                onChange={(event) =>
                  setField(
                    'bathrooms',
                    clampToRange(Number(event.target.value), residenceDefaults.bathrooms),
                    'property-bathrooms'
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(fieldError('property-bathrooms'))}
                className={cn('pl-9', fieldError('property-bathrooms') && 'border-destructive')}
              />
            </div>
          </SettingsField>

          <SettingsField
            id="property-floors"
            label="Floor"
            required
            error={fieldError('property-floors')}
          >
            <Input
              id="property-floors"
              type="number"
              min={residenceDefaults.floors.min}
              max={residenceDefaults.floors.max}
              value={draft.floors}
              onChange={(event) =>
                setField(
                  'floors',
                  clampToRange(Number(event.target.value), residenceDefaults.floors),
                  'property-floors'
                )
              }
              disabled={disabled}
              aria-invalid={Boolean(fieldError('property-floors'))}
              className={cn(fieldError('property-floors') && 'border-destructive')}
            />
          </SettingsField>

          <SettingsField
            id="property-max-adults"
            label="Max Adults"
            required
            error={fieldError('property-max-adults')}
          >
            <div className="relative">
              <Users
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="property-max-adults"
                type="number"
                min={residenceDefaults.maxAdults.min}
                max={residenceDefaults.maxAdults.max}
                value={draft.maxAdults}
                onChange={(event) =>
                  handleMaxAdultsChange(
                    clampToRange(Number(event.target.value), residenceDefaults.maxAdults)
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(fieldError('property-max-adults'))}
                className={cn('pl-9', fieldError('property-max-adults') && 'border-destructive')}
              />
            </div>
          </SettingsField>

          <SettingsField
            id="property-max-children"
            label="Max Children"
            required
            error={fieldError('property-max-children')}
          >
            <div className="relative">
              <Baby
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="property-max-children"
                type="number"
                min={residenceDefaults.maxChildren.min}
                max={residenceDefaults.maxChildren.max}
                value={draft.maxChildren}
                onChange={(event) =>
                  handleMaxChildrenChange(
                    clampToRange(Number(event.target.value), residenceDefaults.maxChildren)
                  )
                }
                disabled={disabled}
                aria-invalid={Boolean(fieldError('property-max-children'))}
                className={cn('pl-9', fieldError('property-max-children') && 'border-destructive')}
              />
            </div>
          </SettingsField>

          <SettingsField id="property-total-guests" label="Total Guests">
            <Input
              id="property-total-guests"
              type="number"
              value={totalGuests}
              readOnly
              disabled={disabled}
              tabIndex={-1}
              aria-readonly="true"
              className="bg-muted/40 tabular-nums"
            />
          </SettingsField>
        </div>

        <FieldGrid>
          <SettingsField
            id="property-check-in"
            label="Check-in Time"
            required
            error={fieldError('property-check-in')}
          >
            <Input
              id="property-check-in"
              type="time"
              value={draft.checkInTime}
              onChange={(event) => setField('checkInTime', event.target.value, 'property-check-in')}
              disabled={disabled}
              aria-invalid={Boolean(fieldError('property-check-in'))}
              className={cn(fieldError('property-check-in') && 'border-destructive')}
            />
          </SettingsField>

          <SettingsField
            id="property-check-out"
            label="Check-out Time"
            required
            error={fieldError('property-check-out')}
          >
            <Input
              id="property-check-out"
              type="time"
              value={draft.checkOutTime}
              onChange={(event) =>
                setField('checkOutTime', event.target.value, 'property-check-out')
              }
              disabled={disabled}
              aria-invalid={Boolean(fieldError('property-check-out'))}
              className={cn(fieldError('property-check-out') && 'border-destructive')}
            />
          </SettingsField>
        </FieldGrid>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
          <Checkbox
            checked={draft.selfCheckIn}
            onCheckedChange={(checked) => onChange('selfCheckIn', checked === true)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Self Check-in Available</span>
            <span className="text-muted-foreground block text-sm">
              Guests can check themselves in using a lockbox, smart lock, or similar method.
            </span>
          </span>
        </label>
      </AdminSection>

      <AdminSection
        id="amenities"
        title="Amenities"
        icon={Sparkles}
        description="Select the amenities available at your property. This helps guests find what they're looking for."
      >
        {propertySettingsSectionBanner('amenities', sectionMessages) ? (
          <PropertySettingsSectionAlert
            message={propertySettingsSectionBanner('amenities', sectionMessages)!}
          />
        ) : null}
        <div className="bg-muted/40 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">
            {draft.enabledAmenities.length} amenities selected
            {draft.customAmenities.length > 0 ? ` · ${draft.customAmenities.length} custom` : ''}
          </p>
        </div>

        <div className="space-y-4">
          {AMENITY_CATEGORIES.map((category) => {
            const categoryCustom = getCustomAmenitiesForCategory(category.id);
            const totalCount = category.amenities.length + categoryCustom.length;
            const enabledCount =
              category.amenities.filter((entry) => draft.enabledAmenities.includes(entry.id))
                .length +
              categoryCustom.filter((entry) => draft.enabledAmenities.includes(entry.id)).length;

            return (
              <Collapsible
                key={category.id}
                defaultOpen
                className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
              >
                <CollapsibleTrigger className="hover:bg-muted/40 data-[state=open]:border-border/60 data-[state=open]:bg-muted/20 group flex min-h-[44px] w-full items-center justify-between border-b border-transparent px-4 py-3 text-left transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <category.icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {enabledCount}/{totalCount}
                    </span>
                  </div>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {category.amenities.map((amenity) => {
                      const enabled = draft.enabledAmenities.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={cn(
                            'flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                            enabled
                              ? 'border-border bg-background shadow-sm'
                              : 'border-border/60 hover:bg-muted/40'
                          )}
                        >
                          <CheckboxDisplay checked={enabled} />
                          <span className="min-w-0 flex-1">{amenity.name}</span>
                        </button>
                      );
                    })}

                    {categoryCustom.map((amenity) => {
                      const enabled = draft.enabledAmenities.includes(amenity.id);
                      return (
                        <div
                          key={amenity.id}
                          className={cn(
                            'flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2.5',
                            enabled ? 'border-border bg-background shadow-sm' : 'border-border/60'
                          )}
                        >
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleAmenity(amenity.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm"
                          >
                            <CheckboxDisplay checked={enabled} />
                            <span className="truncate">{amenity.name}</span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px] shrink-0"
                            disabled={disabled}
                            onClick={() => removeCustomAmenity(amenity.id)}
                            aria-label={`Remove ${amenity.name}`}
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <LimitedCountInput
                      value={newCustomAmenityInputs[category.id] ?? ''}
                      onChange={(event) =>
                        onNewCustomAmenityInputChange(category.id, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomAmenity(category.id);
                        }
                      }}
                      disabled={disabled}
                      placeholder="Add custom amenity..."
                      maxLength={CUSTOM_AMENITY_MAX_LENGTH}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled || !newCustomAmenityInputs[category.id]?.trim()}
                      onClick={() => addCustomAmenity(category.id)}
                      className="min-h-[44px] shrink-0"
                    >
                      <Plus className="mr-1 size-4" aria-hidden />
                      Add
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection id="house-rules" title="House Rules" icon={ListChecks}>
        <div className="bg-muted/40 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">
            {draft.enabledHouseRules.length} rules selected
            {draft.customHouseRules.length > 0 ? ` · ${draft.customHouseRules.length} custom` : ''}
          </p>
        </div>

        <div className="space-y-4">
          {HOUSE_RULE_CATEGORIES.map((category) => {
            const categoryCustom = getCustomHouseRulesForCategory(category.id);
            const totalCount = category.rules.length + categoryCustom.length;
            const enabledCount =
              category.rules.filter((entry) => draft.enabledHouseRules.includes(entry.id)).length +
              categoryCustom.filter((entry) => draft.enabledHouseRules.includes(entry.id)).length;

            return (
              <Collapsible
                key={category.id}
                defaultOpen
                className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
              >
                <CollapsibleTrigger className="hover:bg-muted/40 data-[state=open]:border-border/60 data-[state=open]:bg-muted/20 group flex min-h-[44px] w-full items-center justify-between border-b border-transparent px-4 py-3 text-left transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <category.icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {enabledCount}/{totalCount}
                    </span>
                  </div>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90"
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {category.rules.map((rule) => {
                      const enabled = draft.enabledHouseRules.includes(rule.id);
                      return (
                        <button
                          key={rule.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleHouseRule(rule.id)}
                          className={cn(
                            'flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                            enabled
                              ? 'border-border bg-background shadow-sm'
                              : 'border-border/60 hover:bg-muted/40'
                          )}
                        >
                          <CheckboxDisplay checked={enabled} />
                          <span className="min-w-0 flex-1">{rule.name}</span>
                        </button>
                      );
                    })}

                    {categoryCustom.map((rule) => {
                      const enabled = draft.enabledHouseRules.includes(rule.id);
                      return (
                        <div
                          key={rule.id}
                          className={cn(
                            'flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2.5',
                            enabled ? 'border-border bg-background shadow-sm' : 'border-border/60'
                          )}
                        >
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleHouseRule(rule.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm"
                          >
                            <CheckboxDisplay checked={enabled} />
                            <span className="truncate">{rule.name}</span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px] shrink-0"
                            disabled={disabled}
                            onClick={() => removeCustomHouseRule(rule.id)}
                            aria-label={`Remove ${rule.name}`}
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <LimitedCountInput
                      value={newCustomHouseRuleInputs[category.id] ?? ''}
                      onChange={(event) =>
                        onNewCustomHouseRuleInputChange(category.id, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomHouseRule(category.id);
                        }
                      }}
                      disabled={disabled}
                      placeholder="Add custom rule..."
                      maxLength={HOUSE_RULE_CUSTOM_MAX_LENGTH}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled || !newCustomHouseRuleInputs[category.id]?.trim()}
                      onClick={() => addCustomHouseRule(category.id)}
                      className="min-h-[44px] shrink-0"
                    >
                      <Plus className="mr-1 size-4" aria-hidden />
                      Add
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </AdminSection>

      <PropertyCancellationPolicySection
        policy={draft.cancellationPolicy}
        disabled={disabled}
        resolveFieldError={fieldError}
        markFieldInteracted={markFieldInteracted}
        onChange={(policy) => onChange('cancellationPolicy', policy)}
      />

      <AdminSection
        id="location"
        title="Location"
        icon={MapPin}
        description="Provide accurate location details to help guests find your property."
      >
        <PropertyLocationPicker
          disabled={disabled}
          addressError={fieldError('property-address')}
          mapError={fieldError('property-location-map')}
          onFieldInteract={markFieldInteracted}
          value={{
            address: draft.address,
            city: draft.city,
            province: draft.province,
            country: draft.country,
            zipCode: draft.zipCode,
            latitude: draft.latitude,
            longitude: draft.longitude,
            mapsUrl: draft.mapsUrl,
            placeId: draft.placeId,
          }}
          onChange={(patch) => {
            (
              Object.entries(patch) as [keyof typeof patch, (typeof patch)[keyof typeof patch]][]
            ).forEach(([key, fieldValue]) => {
              onChange(
                key as keyof PropertyProfileDraft,
                fieldValue as PropertyProfileDraft[keyof PropertyProfileDraft]
              );
            });
          }}
        />
      </AdminSection>
    </>
  );
}

export function PropertyDangerZoneSection({
  propertyName,
  isArchived,
  disabled = false,
  onArchive,
  onRestore,
  onDelete,
  archivePending = false,
  restorePending = false,
  deletePending = false,
}: {
  propertyName: string;
  isArchived: boolean;
  disabled?: boolean;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
  onDelete: () => Promise<void>;
  archivePending?: boolean;
  restorePending?: boolean;
  deletePending?: boolean;
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleArchive = async () => {
    try {
      await onArchive();
      setArchiveOpen(false);
    } catch {
      // Parent shows toast
    }
  };

  const handleRestore = async () => {
    try {
      await onRestore();
      setRestoreOpen(false);
    } catch {
      // Parent shows toast
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete();
      setDeleteOpen(false);
    } catch {
      // Parent shows toast
    }
  };

  return (
    <AdminSection
      id="danger"
      title="Danger Zone"
      icon={AlertTriangle}
      description="Irreversible actions that permanently affect this property."
      className="border-destructive/50"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isArchived ? 'Restore Property' : 'Archive Property'}
            </p>
            <p className="text-muted-foreground text-sm">
              {isArchived
                ? 'Sets status to Active — shows the property in active listings again.'
                : 'Sets status to Inactive — hides the property from active listings. Booking history and settings are kept.'}
            </p>
          </div>
          {isArchived ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || restorePending}
              className="min-h-[44px] shrink-0"
              onClick={() => setRestoreOpen(true)}
            >
              {restorePending ? 'Restoring…' : 'Restore'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || archivePending}
              className="min-h-[44px] shrink-0"
              onClick={() => setArchiveOpen(true)}
            >
              {archivePending ? 'Archiving…' : 'Archive'}
            </Button>
          )}
        </div>

        <div className="border-destructive/50 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-destructive text-sm font-medium">Delete Property</p>
            <p className="text-muted-foreground text-sm">
              Permanently removes this property, its gallery, integrations, and settings. Only
              allowed when there is no booking history. This cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled || deletePending}
            className="min-h-[44px] shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            {deletePending ? 'Deleting…' : 'Delete Property'}
          </Button>
        </div>
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle>Archive {propertyName}?</DialogTitle>
            <DialogDescription>
              The property will be marked Inactive. Existing bookings and records stay in place. You
              can restore it anytime from this section.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={archivePending}
              onClick={() => setArchiveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={archivePending}
              onClick={() => void handleArchive()}
            >
              {archivePending ? 'Archiving…' : 'Archive property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle>Restore {propertyName}?</DialogTitle>
            <DialogDescription>
              The property will be marked Active and appear in active listings again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={restorePending}
              onClick={() => setRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={restorePending}
              onClick={() => void handleRestore()}
            >
              {restorePending ? 'Restoring…' : 'Restore property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete {propertyName}?</DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground space-y-2 text-sm">
                <p>
                  This permanently deletes the property profile, gallery media, payment settings,
                  Telegram configs, and Google integration for this property.
                </p>
                <p>
                  Deletion is blocked if any bookings exist. Use{' '}
                  <span className="text-foreground font-medium">Archive Property</span> instead to
                  hide the property.
                </p>
                <p className="text-destructive font-medium">This action cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={deletePending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={deletePending}
              onClick={() => void handleDelete()}
            >
              {deletePending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSection>
  );
}
