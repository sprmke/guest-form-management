import { OrgSettingsField } from '@/features/dashboard/org/components/org-settings/OrgSettingsFields';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_ORG_BRAND_COLOR } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  value: string;
  resolvedColor: string;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  layout?: 'property' | 'org';
  /** Value applied when Reset is clicked — org uses default hex; property clears override. */
  resetValue?: string;
  onChange: (value: string) => void;
};

function BrandColorControls({
  id,
  value,
  resolvedColor,
  disabled,
  error,
  resetValue = DEFAULT_ORG_BRAND_COLOR,
  layout = 'property',
  onChange,
}: Pick<
  Props,
  'id' | 'value' | 'resolvedColor' | 'disabled' | 'error' | 'resetValue' | 'layout' | 'onChange'
>) {
  const pickerValue = value.trim() || resolvedColor;
  const isAtResetValue = value.trim().toLowerCase() === resetValue.trim().toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="border-border size-11 shrink-0 rounded-lg border shadow-sm"
        style={{ backgroundColor: pickerValue }}
        aria-hidden
      />
      <Input
        id={`${id}-picker`}
        type="color"
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-[4.5rem] min-w-[44px] cursor-pointer p-1"
        aria-label="Pick brand color"
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={resolvedColor}
        className={cn(
          'h-11 min-w-0 flex-1 font-mono text-sm sm:max-w-[8rem]',
          error && 'border-destructive'
        )}
        maxLength={7}
        spellCheck={false}
        aria-invalid={Boolean(error)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isAtResetValue}
        className="min-h-[44px] shrink-0"
        onClick={() => onChange(resetValue)}
        aria-label="Reset brand color to default"
      >
        Reset
      </Button>
    </div>
  );
}

export function BrandColorField({
  id,
  value,
  resolvedColor,
  disabled,
  error,
  hint,
  layout = 'property',
  resetValue,
  onChange,
}: Props) {
  const effectiveResetValue =
    resetValue ?? (layout === 'property' ? resolvedColor : DEFAULT_ORG_BRAND_COLOR);

  if (layout === 'org') {
    return (
      <OrgSettingsField id={id} label="Brand color" hint={hint} error={error}>
        <BrandColorControls
          id={id}
          value={value}
          resolvedColor={resolvedColor}
          disabled={disabled}
          error={error}
          resetValue={effectiveResetValue}
          layout={layout}
          onChange={onChange}
        />
      </OrgSettingsField>
    );
  }

  return (
    <SettingsField id={id} label="Brand color" error={error} hintBelow={hint}>
      <BrandColorControls
        id={id}
        value={value}
        resolvedColor={resolvedColor}
        disabled={disabled}
        error={error}
        resetValue={effectiveResetValue}
        layout={layout}
        onChange={onChange}
      />
    </SettingsField>
  );
}
