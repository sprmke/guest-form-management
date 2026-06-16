import { PawPrint, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
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
    <Collapsible
      defaultOpen={false}
      className="rounded-lg border group/collapse border-border bg-muted/15"
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left',
          'text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-controls="pet-details-panel"
      >
        <span className="shrink-0 text-muted-foreground">
          <PawPrint className="size-4" aria-hidden />
        </span>
        <span className="flex-1 min-w-0 text-sm font-semibold">Pet Details</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapse:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          id="pet-details-panel"
          className="space-y-4 border-t border-separator px-3 pt-3 pb-4"
        >
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
