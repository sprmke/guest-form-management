import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PetPdfPreview } from '@/features/admin/components/PetPdfPreview';
import { GafOwnerSignatureUploadField } from '@/features/admin/components/GafOwnerSignatureUploadField';
import type { AppSettingsFieldSource } from '@/features/admin/hooks/useAppSettings';
import type { PetDetailsValues } from '@/lib/petDefaults';

type PetDetailsSettingsSectionProps = {
  values: PetDetailsValues;
  signatureImageUrl: string | null;
  signatureSource?: AppSettingsFieldSource;
  disabled?: boolean;
  onChange: <K extends keyof PetDetailsValues>(
    key: K,
    value: PetDetailsValues[K],
  ) => void;
};

function PetField({
  id,
  label,
  disabled,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
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

export function PetDetailsSettingsSection({
  values,
  signatureImageUrl,
  signatureSource,
  disabled,
  onChange,
}: PetDetailsSettingsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)] lg:gap-5">
      <div className="min-w-0 space-y-4 lg:max-w-md">
        <PetField
          id="pet-unit-owner"
          label="Unit Owner"
          disabled={disabled}
          value={values.gafUnitOwner}
          onChange={(v) => onChange('gafUnitOwner', v)}
          placeholder="Arianna Perez"
        />
        <PetField
          id="pet-tower-unit"
          label="Tower & Unit Number"
          disabled={disabled}
          value={values.gafTowerAndUnitNumber}
          onChange={(v) => onChange('gafTowerAndUnitNumber', v)}
          placeholder="Monaco 2604"
        />
        <GafOwnerSignatureUploadField
          disabled={disabled}
          previewUrl={signatureImageUrl}
          source={signatureSource}
        />
      </div>

      <PetPdfPreview
        details={values}
        signatureUrl={signatureImageUrl}
        className="min-w-0 lg:sticky lg:top-4 lg:self-start"
      />
    </div>
  );
}
