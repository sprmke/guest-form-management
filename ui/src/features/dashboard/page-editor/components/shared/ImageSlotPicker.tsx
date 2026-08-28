import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
};

export function ImageSlotPicker({ images, selected, onChange, max = 8 }: Props) {
  const toggle = (url: string) => {
    if (selected.includes(url)) {
      onChange(selected.filter((entry) => entry !== url));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, url]);
  };

  if (images.length === 0) {
    return <p className="text-muted-foreground text-sm">No property photos yet.</p>;
  }

  return (
    <ul className="grid grid-cols-3 gap-2">
      {images.map((url) => {
        const active = selected.includes(url);
        return (
          <li key={url}>
            <button
              type="button"
              onClick={() => toggle(url)}
              className={cn(
                'relative aspect-square w-full overflow-hidden rounded-md border',
                active ? 'border-primary ring-primary/30 ring-2' : 'border-border'
              )}
              aria-pressed={active}
              aria-label={active ? 'Deselect photo' : 'Select photo'}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
