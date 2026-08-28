import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type CopyValue = {
  heading?: string;
  subheading?: string;
  body?: string;
};

type Props = {
  value: CopyValue;
  onChange: (value: CopyValue) => void;
  onReset?: () => void;
  headingMax?: number;
  subheadingMax?: number;
  bodyMax?: number;
};

export function CopyOverrideField({
  value,
  onChange,
  onReset,
  headingMax = 120,
  subheadingMax = 200,
  bodyMax = 2000,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="showcase-copy-heading">Heading</Label>
        <Input
          id="showcase-copy-heading"
          value={value.heading ?? ''}
          maxLength={headingMax}
          onChange={(event) => onChange({ ...value, heading: event.target.value })}
        />
        <p className="text-muted-foreground text-[11px]">
          {(value.heading ?? '').length}/{headingMax}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="showcase-copy-subheading">Subheading</Label>
        <Input
          id="showcase-copy-subheading"
          value={value.subheading ?? ''}
          maxLength={subheadingMax}
          onChange={(event) => onChange({ ...value, subheading: event.target.value })}
        />
        <p className="text-muted-foreground text-[11px]">
          {(value.subheading ?? '').length}/{subheadingMax}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="showcase-copy-body">Body</Label>
        <Textarea
          id="showcase-copy-body"
          value={value.body ?? ''}
          maxLength={bodyMax}
          rows={4}
          onChange={(event) => onChange({ ...value, body: event.target.value })}
        />
        <p className="text-muted-foreground text-[11px]">
          {(value.body ?? '').length}/{bodyMax}
        </p>
      </div>
      {onReset ? (
        <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2" onClick={onReset}>
          Reset to property data
        </Button>
      ) : null}
    </div>
  );
}
