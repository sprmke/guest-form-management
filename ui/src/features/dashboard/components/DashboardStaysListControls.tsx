import { cn } from '@/lib/utils';

type ToggleProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  disabled?: boolean;
};

function FilterToggle({
  label,
  pressed,
  onPressedChange,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={label}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors sm:min-h-[36px] sm:py-1',
        disabled && 'cursor-not-allowed opacity-50',
        pressed
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
          pressed ? 'gradient-primary' : 'bg-muted',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'inline-block size-3 rounded-full bg-white shadow-sm transition-transform',
            pressed ? 'translate-x-[14px]' : 'translate-x-0.5',
          )}
        />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

type Props = {
  showEmptyDays: boolean;
  showPreviousDates: boolean;
  onShowEmptyDaysChange: (next: boolean) => void;
  onShowPreviousDatesChange: (next: boolean) => void;
  emptyDaysAvailable: boolean;
  className?: string;
};

export function DashboardStaysListControls({
  showEmptyDays,
  showPreviousDates,
  onShowEmptyDaysChange,
  onShowPreviousDatesChange,
  emptyDaysAvailable,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 overflow-x-auto',
        className,
      )}
    >
      <FilterToggle
        label="No check-ins"
        pressed={showEmptyDays}
        onPressedChange={onShowEmptyDaysChange}
        disabled={!emptyDaysAvailable}
      />
      <FilterToggle
        label="Past dates"
        pressed={showPreviousDates}
        onPressedChange={onShowPreviousDatesChange}
      />
    </div>
  );
}
