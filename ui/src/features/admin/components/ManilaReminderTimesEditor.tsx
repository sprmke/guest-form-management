import { Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ManilaReminderSlot } from '@/features/admin/hooks/useTelegramMarketingSettings';

export function slotSort(a: ManilaReminderSlot, b: ManilaReminderSlot): number {
  return a.hour * 60 + a.minute - (b.hour * 60 + b.minute);
}

export function slotToTimeInputValue(slot: ManilaReminderSlot): string {
  return `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
}

export function timeInputValueToSlot(value: string): ManilaReminderSlot | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatManilaTimeLabel(slot: ManilaReminderSlot): string {
  const d = new Date(2000, 0, 1, slot.hour, slot.minute);
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function sanitizeReminderSlots(
  slots: ManilaReminderSlot[],
): ManilaReminderSlot[] {
  const mapped = slots.map((s) => ({
    hour: Math.max(0, Math.min(23, Math.round(s.hour))),
    minute: Math.max(0, Math.min(59, Math.round(s.minute))),
  }));
  const seen = new Set<number>();
  const out: ManilaReminderSlot[] = [];
  for (const s of [...mapped].sort(slotSort)) {
    const k = s.hour * 60 + s.minute;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.length > 0 ? out : [{ hour: 10, minute: 0 }];
}

const MAX_SLOTS = 8;

/** Fixed-width native time input — do not use w-full (overrides Input default). */
const TIME_INPUT_CLASS =
  'h-10 min-h-[44px] w-[9.25rem] shrink-0 px-2.5 text-base sm:text-sm';

type Props = {
  slots: ManilaReminderSlot[];
  disabled?: boolean;
  onChange: (slots: ManilaReminderSlot[]) => void;
  className?: string;
};

export function ManilaReminderTimesEditor({
  slots,
  disabled = false,
  onChange,
  className,
}: Props) {
  const sorted = [...slots].sort(slotSort);
  const atMax = slots.length >= MAX_SLOTS;
  const canRemove = slots.length > 1;

  function updateSlot(index: number, nextSlot: ManilaReminderSlot) {
    const next = [...slots];
    next[index] = nextSlot;
    onChange(sanitizeReminderSlots(next));
  }

  function removeSlot(index: number) {
    if (!canRemove) return;
    onChange(
      sanitizeReminderSlots(slots.filter((_, j) => j !== index)),
    );
  }

  function addSlot() {
    if (atMax) return;
    const last = sorted[sorted.length - 1];
    const nextSlot: ManilaReminderSlot = {
      hour: Math.min(23, (last?.hour ?? 9) + 1),
      minute: last?.minute ?? 0,
    };
    onChange(sanitizeReminderSlots([...slots, nextSlot]));
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {sorted.length > 0 ? (
        <div className="flex flex-wrap gap-1" aria-label="Reminder schedule overview">
          {sorted.map((slot) => {
            const key = `${slot.hour}-${slot.minute}`;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
              >
                <Clock className="size-2.5 text-muted-foreground" aria-hidden />
                {formatManilaTimeLabel(slot)}
              </span>
            );
          })}
        </div>
      ) : null}

      <ul className="space-y-1.5">
        {slots.map((slot, idx) => (
          <li
            key={`${slot.hour}-${slot.minute}-${idx}`}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 shadow-[inset_0_1px_0_hsl(0_0%_100%_/0.04)] dark:bg-background/60 sm:gap-2.5 sm:px-2.5"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-[11px] font-semibold tabular-nums text-muted-foreground"
              aria-hidden
            >
              {idx + 1}
            </span>

            <Input
              id={`tg-slot-time-${idx}`}
              type="time"
              disabled={disabled}
              value={slotToTimeInputValue(slot)}
              aria-label={`Reminder time ${idx + 1}, ${formatManilaTimeLabel(slot)}`}
              className={TIME_INPUT_CLASS}
              onChange={(e) => {
                const parsed = timeInputValueToSlot(e.target.value);
                if (!parsed) return;
                updateSlot(idx, parsed);
              }}
            />

            <Button
              type="button"
              variant="ghost"
              disabled={disabled || !canRemove}
              className="ml-auto h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove reminder ${idx + 1}`}
              onClick={() => removeSlot(idx)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || atMax}
        onClick={addSlot}
        className="min-h-[44px] w-full gap-1.5 sm:w-auto"
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        Add reminder time
      </Button>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {slots.length} of {MAX_SLOTS} daily sends · Manila time
        {atMax ? ' · max reached' : ''}
      </p>
    </div>
  );
}

type TimeSlot = { hour: number; minute: number };

type SingleTimeFieldProps = {
  slot: TimeSlot;
  disabled?: boolean;
  inputId: string;
  onChange: (slot: TimeSlot) => void;
  className?: string;
};

/** Single Manila time picker — compact fixed-width input, helper outside. */
export function ManilaTimeField({
  slot,
  disabled = false,
  inputId,
  onChange,
  className,
}: SingleTimeFieldProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      <Input
        id={inputId}
        type="time"
        disabled={disabled}
        value={slotToTimeInputValue(slot)}
        aria-label={`Daily summary time, ${formatManilaTimeLabel(slot)}`}
        className={TIME_INPUT_CLASS}
        onChange={(e) => {
          const parsed = timeInputValueToSlot(e.target.value);
          if (!parsed) return;
          onChange(parsed);
        }}
      />
      <span className="text-[11px] leading-snug text-muted-foreground">
        Manila time
      </span>
    </div>
  );
}
