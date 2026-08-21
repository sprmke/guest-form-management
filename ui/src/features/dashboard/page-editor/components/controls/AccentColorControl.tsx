import { ColorPicker } from '@/features/dashboard/marketing/components/calendar-builder/components/controls/ColorPicker';

import { Button } from '@/components/ui/button';

type Props = {
  label?: string;
  value: string | null;
  brandColor: string;
  onChange: (value: string | null) => void;
};

export function AccentColorControl({ label = 'Accent', value, brandColor, onChange }: Props) {
  const effective = value?.trim() || brandColor;

  return (
    <div className="space-y-2 px-4">
      <ColorPicker label={label} value={effective} onChange={(next) => onChange(next)} />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[44px] px-0"
          onClick={() => onChange(null)}
        >
          Use brand color
        </Button>
      ) : null}
    </div>
  );
}
