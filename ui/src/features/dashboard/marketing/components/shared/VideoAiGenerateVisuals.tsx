import { Film, Sparkles, Wind, Zap } from 'lucide-react';

import type {
  VideoAiDurationOption,
  VideoAiFontOption,
  VideoAiMotionOption,
  VideoAiSuggestion,
} from '@/features/dashboard/marketing/lib/videoAiGenerateOptions';

import { cn } from '@/lib/utils';

export { VisualChoiceButton } from '@/features/dashboard/marketing/components/shared/CalendarAiGenerateVisuals';

export function VideoSuggestionPreview({
  sceneHint,
  className,
}: {
  sceneHint: number;
  className?: string;
}) {
  const bars = Math.max(3, Math.min(5, sceneHint));
  return (
    <div
      className={cn(
        'bg-muted/70 relative flex h-16 w-full items-end gap-1 overflow-hidden rounded-lg p-2',
        className
      )}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={index}
          className="bg-primary/60 flex-1 rounded-sm"
          style={{ height: `${30 + ((index * 17) % 55)}%` }}
        />
      ))}
      <Film className="text-muted-foreground absolute right-2 top-2 size-3.5" aria-hidden />
    </div>
  );
}

/** Longest offered duration — bar width is proportional to this. */
const MAX_PREVIEW_SECONDS = 25;

function DurationThumb({ seconds }: { seconds: number | null }) {
  if (seconds == null) {
    return (
      <div className="bg-muted/70 text-muted-foreground flex size-full items-center justify-center rounded-md">
        <Sparkles className="size-3.5" aria-hidden />
      </div>
    );
  }
  const widthPct = Math.round(Math.min(1, seconds / MAX_PREVIEW_SECONDS) * 100);
  return (
    <div className="bg-muted/40 flex size-full items-center rounded-md p-1.5">
      <span className="bg-primary/70 h-1.5 rounded-full" style={{ width: `${widthPct}%` }} />
    </div>
  );
}

function MotionThumb({ preview }: { preview: VideoAiMotionOption['preview'] }) {
  if (preview === 'auto') {
    return (
      <div className="bg-muted/70 text-muted-foreground flex size-full items-center justify-center rounded-md">
        <Sparkles className="size-3.5" aria-hidden />
      </div>
    );
  }
  if (preview === 'calm') {
    return (
      <div className="bg-muted/40 flex size-full items-center justify-center rounded-md">
        <Wind className="text-primary/70 size-4" aria-hidden />
      </div>
    );
  }
  if (preview === 'energetic') {
    return (
      <div className="bg-muted/40 flex size-full items-center justify-center rounded-md">
        <Zap className="text-primary/70 size-4" aria-hidden />
      </div>
    );
  }
  return (
    <div className="bg-muted/40 flex size-full items-center justify-center rounded-md">
      <Film className="text-primary/70 size-4" aria-hidden />
    </div>
  );
}

export function VideoDurationOptionPreview({ option }: { option: VideoAiDurationOption }) {
  return (
    <div className="bg-muted/30 size-9 shrink-0 overflow-hidden rounded-md border border-black/5 p-0.5">
      <DurationThumb seconds={option.seconds} />
    </div>
  );
}

export function VideoFontOptionPreview({ option }: { option: VideoAiFontOption }) {
  return (
    <div className="bg-muted/30 text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border border-black/5">
      <span
        className="text-sm font-semibold leading-none"
        style={{ fontFamily: option.fontFamily }}
      >
        {option.sample}
      </span>
    </div>
  );
}

export function VideoMotionOptionPreview({ option }: { option: VideoAiMotionOption }) {
  return (
    <div className="bg-muted/30 size-9 shrink-0 overflow-hidden rounded-md border border-black/5 p-0.5">
      <MotionThumb preview={option.preview} />
    </div>
  );
}

export function VideoCategoryChips({
  value,
  disabled,
  labels,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  labels: Record<string, string>;
  onChange: (category: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1" role="group" aria-label="Category">
      {Object.entries(labels).map(([id, label]) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'focus-visible:ring-ring min-h-[36px] min-w-0 cursor-pointer rounded-full border px-1 py-1 text-center text-[10px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 sm:text-[11px]',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border/70 bg-background text-foreground hover:bg-background/80'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export type { VideoAiSuggestion };
