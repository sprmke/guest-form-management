import { useEffect, useState } from 'react';

import { AlertTriangle, Baby, Bath, Bed, Home, Info, MapPin, Users } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import {
  applyUnitTypeDefaultsToProfile,
  findUnitTypeById,
} from '@/features/dashboard/bookings/lib/unitTypes';
import { PropertyGuestFormSettingsSection } from '@/features/dashboard/org/components/property-settings/PropertyGuestFormSettingsSection';
import { PropertyLocationPicker } from '@/features/dashboard/org/components/property-settings/PropertyLocationPicker';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { TowerUnitConflictAlert } from '@/features/dashboard/org/components/TowerUnitConflictAlert';
import { useResidenceUnitTypes } from '@/features/dashboard/org/hooks/useResidenceUnitTypes';
import { DEFAULT_RESIDENCE_NAME } from '@/features/dashboard/org/lib/propertyDisplay';
import {
  clampToRange,
  getResidencePropertyDefaults,
} from '@/features/dashboard/org/lib/propertyResidenceDefaults';
import {
  getPropertyResidenceNames,
  isCondoPropertyType,
  isTowerInResidence,
} from '@/features/dashboard/org/lib/propertyResidences';
import { type PropertySettingsSectionId } from '@/features/dashboard/org/lib/propertySettingsCompletion';
import { PROPERTY_TYPES } from '@/features/dashboard/org/lib/propertySettingsConstants';
import {
  propertyGuestCapacityTotal,
  type PropertyProfileDraft,
} from '@/features/dashboard/org/lib/propertySettingsForm';
import { isValidUnitNumber } from '@/features/dashboard/org/lib/propertyTowerUnit';
import type { PropertyTowerUnitConflict } from '@/features/dashboard/org/lib/propertyTowerUnitConflict';

import { AvailabilityCheckInput } from '@/components/AvailabilityCheckInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AvailabilityCheckState } from '@/lib/availabilityCheckState';
import { cn } from '@/lib/utils';

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">{children}</div>;
}

type ProfileSectionsProps = {
  draft: PropertyProfileDraft;
  onChange: <K extends keyof PropertyProfileDraft>(key: K, value: PropertyProfileDraft[K]) => void;
  disabled?: boolean;
  propertySlugPrefix: string;
  slugPreview: string;
  towerConflict: PropertyTowerUnitConflict | null;
  nameUnavailable?: boolean;
  nameConflictMessage?: string | null;
  nameAvailabilityState?: AvailabilityCheckState;
  resolveFieldError: (fieldId: string) => string | null;
  markFieldInteracted: (fieldId: string) => void;
  sectionMessages?: Partial<Record<PropertySettingsSectionId, string>>;
};

export function PropertyProfileMainSections({
  draft,
  onChange,
  disabled = false,
  propertySlugPrefix,
  slugPreview,
  towerConflict,
  nameUnavailable = false,
  nameConflictMessage = null,
  nameAvailabilityState = 'idle',
  resolveFieldError,
  markFieldInteracted,
  sectionMessages: _sectionMessages = {},
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
  const towerValid =
    isCondo && Boolean(draft.tower) && isTowerInResidence(draft.tower, effectiveResidence);
  const towerUnitReady = towerValid && isValidUnitNumber(draft.unitNumber);
  const hasDuplicate = towerUnitReady && towerConflict !== null;
  const propertyTypeLabel =
    PROPERTY_TYPES.find((type) => type.value === draft.type)?.label ?? draft.type;
  const readOnlyFieldClass = 'bg-muted/40';
  const { data: unitTypes = [] } = useResidenceUnitTypes(effectiveResidence);

  const handleUnitTypeChange = (unitTypeId: string) => {
    markFieldInteracted('property-unit-type');
    const selected = findUnitTypeById(unitTypes, unitTypeId);
    if (!selected) return;
    const defaults = applyUnitTypeDefaultsToProfile(selected);
    onChange('unitTypeId', selected.id);
    onChange('bedrooms', defaults.bedrooms);
    onChange('bathrooms', defaults.bathrooms);
    onChange('maxAdults', defaults.maxAdults);
    onChange('maxChildren', defaults.maxChildren);
    onChange('maxGuests', propertyGuestCapacityTotal(defaults.maxAdults, defaults.maxChildren));
  };

  useEffect(() => {
    if (!draft.unitTypeId || unitTypes.length === 0) return;
    const selected = findUnitTypeById(unitTypes, draft.unitTypeId);
    if (!selected) return;
    const defaults = applyUnitTypeDefaultsToProfile(selected);
    if (
      draft.bedrooms !== defaults.bedrooms ||
      draft.bathrooms !== defaults.bathrooms ||
      draft.maxAdults !== defaults.maxAdults ||
      draft.maxChildren !== defaults.maxChildren
    ) {
      onChange('bedrooms', defaults.bedrooms);
      onChange('bathrooms', defaults.bathrooms);
      onChange('maxAdults', defaults.maxAdults);
      onChange('maxChildren', defaults.maxChildren);
      onChange('maxGuests', propertyGuestCapacityTotal(defaults.maxAdults, defaults.maxChildren));
    }
  }, [draft.unitTypeId, unitTypes, onChange]);

  const residenceDefaults = getResidencePropertyDefaults(effectiveResidence);

  return (
    <>
      <AdminSection
        id="basic"
        title="Basic Information"
        icon={Info}
        description="Name and contact details."
      >
        <SettingsField
          id="property-name"
          label="Property Name"
          required
          error={
            fieldError('property-name') ??
            (nameUnavailable
              ? (nameConflictMessage ?? 'A property with this name already exists')
              : null)
          }
          hintBelow={
            !fieldError('property-name') && !nameUnavailable
              ? 'This is the name guests will see when searching for your property.'
              : undefined
          }
        >
          <AvailabilityCheckInput
            id="property-name"
            value={draft.name}
            onChange={(event) => setField('name', event.target.value, 'property-name')}
            disabled={disabled}
            placeholder="Enter property name"
            maxLength={120}
            aria-invalid={Boolean(fieldError('property-name') || nameUnavailable)}
            className={cn((fieldError('property-name') || nameUnavailable) && 'border-destructive')}
            checkState={nameAvailabilityState}
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

        <FieldGrid>
          <SettingsField
            id="property-type"
            label="Property Type"
            required
            error={fieldError('property-type')}
          >
            <Input
              id="property-type"
              value={propertyTypeLabel}
              readOnly
              disabled={disabled}
              tabIndex={-1}
              aria-readonly="true"
              aria-invalid={Boolean(fieldError('property-type'))}
              className={cn(
                readOnlyFieldClass,
                fieldError('property-type') && 'border-destructive'
              )}
            />
          </SettingsField>

          {isCondo ? (
            <SettingsField
              id="property-residence"
              label="Residence"
              required
              error={fieldError('property-residence')}
            >
              <Input
                id="property-residence"
                value={draft.residenceName.trim() || residenceOptions[0] || ''}
                readOnly
                disabled={disabled}
                tabIndex={-1}
                aria-readonly="true"
                aria-invalid={Boolean(fieldError('property-residence'))}
                className={cn(
                  readOnlyFieldClass,
                  fieldError('property-residence') && 'border-destructive'
                )}
              />
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
                <Input
                  id="property-tower"
                  value={draft.tower || ''}
                  readOnly
                  disabled={disabled}
                  tabIndex={-1}
                  aria-readonly="true"
                  aria-invalid={Boolean(fieldError('property-tower') || hasDuplicate)}
                  className={cn(
                    readOnlyFieldClass,
                    (fieldError('property-tower') || hasDuplicate) && 'border-destructive'
                  )}
                />
              </SettingsField>

              <SettingsField
                id="property-unit"
                label="Unit"
                required
                error={fieldError('property-unit')}
              >
                <Input
                  id="property-unit"
                  value={draft.unitNumber}
                  readOnly
                  disabled={disabled}
                  tabIndex={-1}
                  aria-readonly="true"
                  aria-invalid={Boolean(fieldError('property-unit') || hasDuplicate)}
                  className={cn(
                    readOnlyFieldClass,
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
      </AdminSection>

      <AdminSection
        id="details"
        title="Property Details"
        icon={Home}
        description="Bedrooms, bathrooms, floor, and max guests."
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SettingsField
            id="property-unit-type"
            label="Unit type"
            required
            error={fieldError('property-unit-type')}
          >
            <Select
              value={draft.unitTypeId || undefined}
              onValueChange={handleUnitTypeChange}
              disabled={disabled || unitTypes.length === 0}
            >
              <SelectTrigger
                id="property-unit-type"
                aria-invalid={Boolean(fieldError('property-unit-type'))}
                className={cn(fieldError('property-unit-type') && 'border-destructive')}
              >
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                {unitTypes.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>

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
                value={draft.bedrooms}
                readOnly
                disabled={disabled}
                tabIndex={-1}
                aria-readonly="true"
                aria-invalid={Boolean(fieldError('property-bedrooms'))}
                className={cn(
                  'bg-muted/40 pl-9 tabular-nums',
                  fieldError('property-bedrooms') && 'border-destructive'
                )}
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
                step={0.5}
                value={draft.bathrooms}
                readOnly
                disabled={disabled}
                tabIndex={-1}
                aria-readonly="true"
                aria-invalid={Boolean(fieldError('property-bathrooms'))}
                className={cn(
                  'bg-muted/40 pl-9 tabular-nums',
                  fieldError('property-bathrooms') && 'border-destructive'
                )}
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
                value={draft.maxAdults}
                readOnly
                disabled={disabled}
                tabIndex={-1}
                aria-readonly="true"
                className={cn(
                  'bg-muted/40 pl-9 tabular-nums',
                  fieldError('property-max-adults') && 'border-destructive'
                )}
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
                value={draft.maxChildren}
                readOnly
                disabled={disabled}
                tabIndex={-1}
                aria-readonly="true"
                className={cn(
                  'bg-muted/40 pl-9 tabular-nums',
                  fieldError('property-max-children') && 'border-destructive'
                )}
              />
            </div>
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

      <PropertyGuestFormSettingsSection draft={draft} disabled={disabled} onChange={onChange} />

      <AdminSection id="location" title="Location" icon={MapPin} description="Address and map pin.">
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
      description="Archive or permanently delete this property."
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

      <ResponsiveModal open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Archive {propertyName}?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              The property will be marked Inactive. Existing bookings and records stay in place. You
              can restore it anytime from this section.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
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
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal open={restoreOpen} onOpenChange={setRestoreOpen}>
        <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Restore {propertyName}?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              The property will be marked Active and appear in active listings again.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
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
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle className="text-destructive">
              Delete {propertyName}?
            </ResponsiveModalTitle>
            <ResponsiveModalDescription asChild>
              <div className="text-muted-foreground space-y-2 text-sm">
                <p>
                  This permanently deletes the property profile, gallery media, payment settings,
                  and Telegram configs for this property.
                </p>
                <p>
                  Deletion is blocked if any bookings exist. Use{' '}
                  <span className="text-foreground font-medium">Archive Property</span> instead to
                  hide the property.
                </p>
                <p className="text-destructive font-medium">This action cannot be undone.</p>
              </div>
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
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
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </AdminSection>
  );
}
