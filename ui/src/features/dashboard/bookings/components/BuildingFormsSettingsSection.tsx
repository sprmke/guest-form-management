import { useState } from 'react';

import { FileText, PawPrint } from 'lucide-react';

import { GafOwnerSignatureUploadField } from '@/features/dashboard/bookings/components/GafOwnerSignatureUploadField';
import { GafPdfPreview } from '@/features/dashboard/bookings/components/GafPdfPreview';
import { PetPdfPreview } from '@/features/dashboard/bookings/components/PetPdfPreview';
import type { AppSettingsFieldSource } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';
import { Input } from '@/components/ui/input';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import type { GafDetailsValues } from '@/features/dashboard/bookings/lib/gafDefaults';
import type { PetDetailsValues } from '@/features/dashboard/bookings/lib/petDefaults';
import { cn } from '@/lib/utils';

type PreviewTab = 'gaf' | 'pet';

const PREVIEW_TABS: {
  value: PreviewTab;
  label: string;
  shortLabel: string;
  Icon: typeof FileText;
}[] = [
  {
    value: 'gaf',
    label: 'Guest Advisory Form',
    shortLabel: 'GAF',
    Icon: FileText,
  },
  {
    value: 'pet',
    label: 'Pet Registration',
    shortLabel: 'Pet',
    Icon: PawPrint,
  },
];

type BuildingFormsSettingsSectionProps = {
  values: GafDetailsValues;
  towerUnitLabel: string;
  signatureImageUrl: string | null;
  signatureSource?: AppSettingsFieldSource;
  disabled?: boolean;
  onChange: <K extends keyof GafDetailsValues>(key: K, value: GafDetailsValues[K]) => void;
  onSignatureInteracted?: () => void;
  resolveFieldError: (fieldId: string) => string | null;
};

function BuildingFormField({
  id,
  label,
  disabled,
  readOnly = false,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  readOnly?: boolean;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <SettingsField id={id} label={label} required={required} error={error}>
      <Input
        id={id}
        type={type}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={readOnly ? undefined : (event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={cn(error && 'border-destructive', readOnly && 'bg-muted/30 cursor-default')}
      />
    </SettingsField>
  );
}

export function BuildingFormsSettingsSection({
  values,
  towerUnitLabel,
  signatureImageUrl,
  signatureSource,
  disabled,
  onChange,
  onSignatureInteracted,
  resolveFieldError,
}: BuildingFormsSettingsSectionProps) {
  const fieldError = resolveFieldError;

  const [previewTab, setPreviewTab] = useState<PreviewTab>('gaf');

  const petValues: PetDetailsValues = {
    gafUnitOwner: values.gafUnitOwner,
    gafTowerAndUnitNumber: values.gafTowerAndUnitNumber,
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,34%)_minmax(0,66%)] lg:gap-8">
      <div className="min-w-0 space-y-4 lg:max-w-md">
        <BuildingFormField
          id="gaf-unit-owner"
          label="Unit Owner"
          required
          error={fieldError('gaf-unit-owner')}
          disabled={disabled}
          value={values.gafUnitOwner}
          onChange={(value) => onChange('gafUnitOwner', value)}
          placeholder={FORM_PLACEHOLDERS.fullName}
        />
        <BuildingFormField
          id="gaf-tower-unit"
          label="Tower & Unit Number"
          required
          readOnly
          error={fieldError('gaf-tower-unit')}
          disabled={disabled}
          value={towerUnitLabel}
          placeholder={FORM_PLACEHOLDERS.towerAndUnit}
        />
        <BuildingFormField
          id="gaf-onsite-contact"
          label="On-Site Contact Person"
          required
          error={fieldError('gaf-onsite-contact')}
          disabled={disabled}
          value={values.gafGuestsOnsiteContactPerson}
          onChange={(value) => onChange('gafGuestsOnsiteContactPerson', value)}
          placeholder={FORM_PLACEHOLDERS.fullName}
        />
        <BuildingFormField
          id="gaf-owner-phone"
          label="Contact No."
          required
          error={fieldError('gaf-owner-phone')}
          disabled={disabled}
          type="tel"
          value={values.gafOwnerContactNumber}
          onChange={(value) => onChange('gafOwnerContactNumber', value)}
          placeholder={FORM_PLACEHOLDERS.phone}
        />
        <GafOwnerSignatureUploadField
          disabled={disabled}
          previewUrl={signatureImageUrl}
          source={signatureSource}
          required
          error={fieldError('gaf-owner-signature')}
          onUploaded={onSignatureInteracted}
        />
      </div>

      <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <SlidingTabs
          value={previewTab}
          onValueChange={(value) => setPreviewTab(value as PreviewTab)}
          className="mb-3 w-full max-w-full sm:max-w-md"
        >
          <SlidingTabsList size="compact" className="segment-shell w-full" aria-label="PDF preview">
            {PREVIEW_TABS.map(({ value, label, shortLabel, Icon }) => (
              <SlidingTabsTrigger
                key={value}
                value={value}
                id={`building-form-preview-tab-${value}`}
                aria-controls={`building-form-preview-panel-${value}`}
                className="segment-item min-h-[44px] flex-1 gap-1.5 px-2.5 sm:px-3"
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate sm:hidden">{shortLabel}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </SlidingTabsTrigger>
            ))}
          </SlidingTabsList>
        </SlidingTabs>

        <div
          role="tabpanel"
          id={`building-form-preview-panel-${previewTab}`}
          aria-labelledby={`building-form-preview-tab-${previewTab}`}
        >
          {previewTab === 'gaf' ? (
            <GafPdfPreview details={values} signatureUrl={signatureImageUrl} />
          ) : (
            <PetPdfPreview details={petValues} signatureUrl={signatureImageUrl} />
          )}
        </div>
      </div>
    </div>
  );
}
