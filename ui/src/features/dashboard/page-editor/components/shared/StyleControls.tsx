import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function ColumnCountControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Columns</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            className={cn(
              'min-h-11 min-w-11 rounded-md border text-sm',
              value === count ? 'border-primary bg-primary/10' : 'border-border'
            )}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PaletteControl({
  mode,
  accent,
  overlay,
  onModeChange,
  onAccentChange,
  onOverlayChange,
}: {
  mode: 'light' | 'dark' | 'warm';
  accent: 'brand' | 'custom';
  overlay: 'none' | 'soft' | 'strong';
  onModeChange: (mode: 'light' | 'dark' | 'warm') => void;
  onAccentChange: (accent: 'brand' | 'custom') => void;
  onOverlayChange: (overlay: 'none' | 'soft' | 'strong') => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Palette mode</Label>
        <Select value={mode} onValueChange={(value) => onModeChange(value as typeof mode)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Accent</Label>
        <Select value={accent} onValueChange={(value) => onAccentChange(value as typeof accent)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="brand">Brand</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Overlay</Label>
        <Select value={overlay} onValueChange={(value) => onOverlayChange(value as typeof overlay)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="soft">Soft</SelectItem>
            <SelectItem value="strong">Strong</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

type DisplayFont = 'jakarta' | 'outfit' | 'instrument' | 'cormorant' | 'fraunces';
type TypeScale = 'sm' | 'md' | 'lg';

export function TypographyControl({
  displayFont,
  scale,
  onDisplayFontChange,
  onScaleChange,
}: {
  displayFont: DisplayFont;
  scale: TypeScale;
  onDisplayFontChange: (font: DisplayFont) => void;
  onScaleChange: (scale: TypeScale) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Display font</Label>
        <Select
          value={displayFont}
          onValueChange={(value) => onDisplayFontChange(value as DisplayFont)}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jakarta">Plus Jakarta</SelectItem>
            <SelectItem value="outfit">Outfit</SelectItem>
            <SelectItem value="instrument">Instrument</SelectItem>
            <SelectItem value="cormorant">Cormorant</SelectItem>
            <SelectItem value="fraunces">Fraunces</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Scale</Label>
        <Select value={scale} onValueChange={(value) => onScaleChange(value as TypeScale)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

type MotionIntensity = 'subtle' | 'standard' | 'bold';

export function MotionControl({
  intensity,
  parallax,
  canvas,
  onIntensityChange,
  onParallaxChange,
  onCanvasChange,
}: {
  intensity: MotionIntensity;
  parallax: boolean;
  canvas: boolean;
  onIntensityChange: (intensity: MotionIntensity) => void;
  onParallaxChange: (parallax: boolean) => void;
  onCanvasChange: (canvas: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Motion intensity</Label>
        <Select
          value={intensity}
          onValueChange={(value) => onIntensityChange(value as MotionIntensity)}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="subtle">Subtle</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor="showcase-parallax">Parallax</Label>
        <Switch id="showcase-parallax" checked={parallax} onCheckedChange={onParallaxChange} />
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor="showcase-canvas">Canvas background</Label>
        <Switch id="showcase-canvas" checked={canvas} onCheckedChange={onCanvasChange} />
      </div>
      <p className="text-muted-foreground text-[11px]">
        Reduced-motion and embed preview disable heavy effects automatically.
      </p>
    </div>
  );
}
