import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GafPdfPreview } from '@/features/admin/components/GafPdfPreview';
import { GafOwnerSignatureUploadField } from '@/features/admin/components/GafOwnerSignatureUploadField';
import type { AppSettingsFieldSource } from '@/features/admin/hooks/useAppSettings';
import type { GafDetailsValues } from '@/lib/gafDefaults';

type GafDetailsSettingsSectionProps = {
  values: GafDetailsValues;
  signatureImageUrl: string | null;
  signatureSource?: AppSettingsFieldSource;
  disabled?: boolean;
  fieldSources?: Partial<Record<keyof GafDetailsValues, AppSettingsFieldSource>>;
  onChange: <K extends keyof GafDetailsValues>(
    key: K,
    value: GafDetailsValues[K],
  ) => void;
};

function GafField({
  id,
  label,
  disabled,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete="off"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
        placeholder={placeholder}
      />
    </div>
  );
}

export function GafDetailsSettingsSection({
  values,
  signatureImageUrl,
  signatureSource,
  disabled,
  onChange,
}: GafDetailsSettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)] lg:gap-5">
      <div className="min-w-0 space-y-4 lg:max-w-md">
        <GafField
          id="gaf-unit-owner"
          label="Unit Owner"
          disabled={disabled}
          value={values.gafUnitOwner}
          onChange={(v) => onChange('gafUnitOwner', v)}
          placeholder="Arianna Perez"
        />
        <GafField
          id="gaf-tower-unit"
          label="Tower & Unit Number"
          disabled={disabled}
          value={values.gafTowerAndUnitNumber}
          onChange={(v) => onChange('gafTowerAndUnitNumber', v)}
          placeholder="Monaco 2604"
        />
        <GafField
          id="gaf-guests-onsite-contact"
          label="On-Site Contact Person"
          disabled={disabled}
          value={values.gafGuestsOnsiteContactPerson}
          onChange={(v) => onChange('gafGuestsOnsiteContactPerson', v)}
          placeholder="Arianna Perez"
        />
        <GafField
          id="gaf-owner-contact-number"
          label="Contact No."
          disabled={disabled}
          type="tel"
          value={values.gafOwnerContactNumber}
          onChange={(v) => onChange('gafOwnerContactNumber', v)}
          placeholder="0962 541 2941"
        />
        <GafOwnerSignatureUploadField
          disabled={disabled}
          previewUrl={signatureImageUrl}
          source={signatureSource}
        />
      </div>

      <GafPdfPreview
        details={values}
        signatureUrl={signatureImageUrl}
        className="min-w-0 lg:sticky lg:top-4 lg:self-start"
      />
    </div>
  );
}
