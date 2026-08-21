import { Check } from 'lucide-react';

import { OrgSettingsField } from '@/features/dashboard/org/components/org-settings/OrgSettingsFields';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Button } from '@/components/ui/button';
import { DEFAULT_ORG_BRAND_COLOR } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

/** Curated pastel-leaning hues, ordered by hue — kept mid saturation/lightness so each reads well as a flat swatch. */
const BRAND_COLOR_PRESETS = [
  { label: 'Coral', hex: '#FB923C' },
  { label: 'Amber', hex: '#FBBF24' },
  { label: 'Lime', hex: '#A3E635' },
  { label: 'Emerald', hex: '#34D399' },
  { label: 'Teal', hex: DEFAULT_ORG_BRAND_COLOR },
  { label: 'Sky', hex: '#38BDF8' },
  { label: 'Indigo', hex: '#6366F1' },
  { label: 'Violet', hex: '#A78BFA' },
  { label: 'Fuchsia', hex: '#E879F9' },
  { label: 'Pink', hex: '#F472B6' },
  { label: 'Rose', hex: '#FB7185' },
] as const;

const RAINBOW_SWATCH_BACKGROUND =
  'conic-gradient(from 180deg, #FB923C, #FBBF24, #A3E635, #34D399, #38BDF8, #6366F1, #E879F9, #FB7185, #FB923C)';

type Props = {
  id: string;
  value: string;
  resolvedColor: string;
  disabled?: boolean;
  error?: string | null;
  help?: string;
  layout?: 'property' | 'org';
  /** Value applied when Reset is clicked — org uses default hex; property clears override. */
  resetValue?: string;
  onChange: (value: string) => void;
  /**
   * When true, omit the built-in "Brand color" label (parent chrome already titles the block).
   * Property Settings / Org Settings keep the default label.
   */
  hideLabel?: boolean;
};

function BrandColorControls({
  id,
  value,
  resolvedColor,
  disabled,
  resetValue = DEFAULT_ORG_BRAND_COLOR,
  onChange,
}: Pick<Props, 'id' | 'value' | 'resolvedColor' | 'disabled' | 'resetValue' | 'onChange'>) {
  const pickerValue = value.trim() || resolvedColor;
  const isAtResetValue = value.trim().toLowerCase() === resetValue.trim().toLowerCase();
  const isCustomSelected = !BRAND_COLOR_PRESETS.some(
    (preset) => preset.hex.toLowerCase() === pickerValue.toLowerCase()
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {BRAND_COLOR_PRESETS.map((preset) => {
        const isSelected = pickerValue.toLowerCase() === preset.hex.toLowerCase();
        return (
          <button
            key={preset.hex}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset.hex)}
            className={cn(
              'border-border flex size-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-transform',
              'disabled:pointer-events-none disabled:opacity-50',
              isSelected && 'ring-foreground ring-offset-background ring-2 ring-offset-2'
            )}
            style={{ backgroundColor: preset.hex }}
            aria-label={`Use ${preset.label} brand color`}
            aria-pressed={isSelected}
          >
            {isSelected && <Check className="size-4 text-white drop-shadow-sm" aria-hidden />}
          </button>
        );
      })}
      <label
        htmlFor={`${id}-picker`}
        className={cn(
          'border-border relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-sm',
          disabled && 'pointer-events-none opacity-50',
          isCustomSelected && 'ring-foreground ring-offset-background ring-2 ring-offset-2'
        )}
        style={{ background: RAINBOW_SWATCH_BACKGROUND }}
      >
        {isCustomSelected && <Check className="size-4 text-white drop-shadow-sm" aria-hidden />}
        <input
          id={`${id}-picker`}
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label="Pick a custom brand color"
        />
      </label>
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
  help,
  layout = 'property',
  resetValue,
  onChange,
  hideLabel = false,
}: Props) {
  const effectiveResetValue =
    resetValue ?? (layout === 'property' ? resolvedColor : DEFAULT_ORG_BRAND_COLOR);

  const controls = (
    <BrandColorControls
      id={id}
      value={value}
      resolvedColor={resolvedColor}
      disabled={disabled}
      resetValue={effectiveResetValue}
      onChange={onChange}
    />
  );

  if (hideLabel) {
    return (
      <div className="space-y-2">
        {controls}
        {error ? (
          <p id={`${id}-error`} className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (layout === 'org') {
    return (
      <OrgSettingsField id={id} label="Brand color" help={help} error={error}>
        {controls}
      </OrgSettingsField>
    );
  }

  return (
    <SettingsField id={id} label="Brand color" error={error} help={help}>
      {controls}
    </SettingsField>
  );
}
