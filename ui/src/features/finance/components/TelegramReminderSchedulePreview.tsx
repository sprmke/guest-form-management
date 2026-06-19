import { useMemo } from "react";
import { formatIsoDate } from "@/features/admin/lib/formatters";
import {
  buildTelegramReminderSchedule,
  reminderIntervalLabel,
  type FinanceReminderInterval,
  type RecurrenceInterval,
} from "@/features/finance/lib/recurrence";
import { cn } from "@/lib/utils";

type Props = {
  anchorDate: string;
  recurrenceInterval: RecurrenceInterval;
  recurrenceUntil?: string;
  daysBefore: number;
  reminderInterval: FinanceReminderInterval;
  singleOccurrenceOnly?: boolean;
  className?: string;
};

export function TelegramReminderSchedulePreview({
  anchorDate,
  recurrenceInterval,
  recurrenceUntil,
  daysBefore,
  reminderInterval,
  singleOccurrenceOnly,
  className,
}: Props) {
  const schedule = useMemo(
    () =>
      buildTelegramReminderSchedule({
        anchorDate,
        recurrenceInterval,
        recurrenceUntil,
        daysBefore,
        singleOccurrenceOnly,
      }),
    [
      anchorDate,
      recurrenceInterval,
      recurrenceUntil,
      daysBefore,
      singleOccurrenceOnly,
    ],
  );

  if (!schedule) return null;

  const { windows, totalCount, isRecurring, recurrenceLabel, seriesEndDate } =
    schedule;
  const window = windows[0];

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 space-y-1.5",
        className,
      )}
      aria-live="polite"
    >
      {isRecurring && recurrenceLabel && seriesEndDate ? (
        <p className="text-caption text-muted-foreground">
          {recurrenceLabel} through {formatIsoDate(seriesEndDate)} ({totalCount}{" "}
          total)
        </p>
      ) : window ? (
        <p className="text-sm tabular-nums text-foreground">
          {formatIsoDate(window.windowStart)} – {formatIsoDate(window.windowEnd)}
        </p>
      ) : null}
      <p className="text-caption text-muted-foreground">
        {reminderIntervalLabel(reminderInterval)} · Manila
      </p>
    </div>
  );
}
