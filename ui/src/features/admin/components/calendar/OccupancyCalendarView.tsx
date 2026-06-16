import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { BookingsCalendarSkeleton } from "@/components/skeletons/AdminSkeletons";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/features/admin/lib/bookingStatus";
import { statusToneStyle } from "@/features/admin/components/StatusBadge";
import { buildOccupancyByDay } from "@/features/admin/components/calendar/calendarDateUtils";
import { CalendarDayDetailPanel } from "@/features/admin/components/calendar/CalendarDayDetailPanel";
import { CalendarMonthGrid } from "@/features/admin/components/calendar/CalendarMonthGrid";
import { CalendarYearGrid } from "@/features/admin/components/calendar/CalendarYearGrid";
import type { CalendarVisibleRange } from "@/features/admin/components/calendar/calendarDateUtils";
import type { DatePreset } from "@/lib/dateNavigation";

export const CALENDAR_OCCUPANCY_LIMIT = 100;

type OccupancyRow = {
  check_in_date: string;
  check_out_date: string;
};

type Props<T extends OccupancyRow> = {
  rows: T[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  getItemKey: (item: T) => string;
  getItemStatus: (item: T) => string;
  renderPill: (item: T) => ReactNode;
  renderDayItem: (item: T) => ReactNode;
  entityLabel: string;
  entityLabelSingular?: string;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  emptySelectCaption?: string;
  emptyDayCaption?: string;
  /** Grid only — no day-detail sidebar (dashboard mini calendar). */
  layout?: "full" | "grid-only";
  compact?: boolean;
  embedded?: boolean;
  onDayClick?: (day: Date, items: T[]) => void;
  onItemClick?: (item: T) => void;
  /** Dashboard: drive grid from global date filter instead of internal month nav. */
  visibleRange?: CalendarVisibleRange;
  datePreset?: DatePreset;
  hideNavigation?: boolean;
};

export function OccupancyCalendarView<T extends OccupancyRow>({
  rows,
  isLoading,
  error,
  isRefreshing,
  getItemKey,
  getItemStatus,
  renderPill,
  renderDayItem,
  entityLabel,
  entityLabelSingular,
  initialMonth,
  onMonthChange,
  emptySelectCaption,
  emptyDayCaption,
  layout = "full",
  compact = false,
  embedded = false,
  onDayClick,
  onItemClick,
  visibleRange,
  datePreset,
  hideNavigation = false,
}: Props<T>) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const singular = entityLabelSingular ?? entityLabel.replace(/s$/, "");

  const itemsByDay = useMemo(
    () =>
      buildOccupancyByDay(
        rows,
        (row) => row.check_in_date,
        (row) => row.check_out_date,
      ),
    [rows],
  );

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    return itemsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, itemsByDay]);

  if (error) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center py-20 text-center rounded-xl border bg-card border-border/50">
        <div className="flex justify-center items-center bg-red-50 rounded-full dark:bg-red-500/15 size-9">
          <span className="text-base font-black leading-none text-red-500">
            !
          </span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-foreground">
            Could not load {entityLabel}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground max-w-xs">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "transition-opacity duration-300",
          isRefreshing && "opacity-60",
        )}
      >
        <BookingsCalendarSkeleton
          gridOnly={layout === "grid-only"}
          compact={compact}
        />
      </div>
    );
  }

  const grid =
    visibleRange && datePreset === "year" ? (
      <CalendarYearGrid
        visibleRange={visibleRange}
        itemsByDay={itemsByDay}
        getItemKey={getItemKey}
        getItemStatus={getItemStatus}
        entityLabel={singular}
        onDayClick={onDayClick}
      />
    ) : (
      <CalendarMonthGrid
        itemsByDay={itemsByDay}
        getItemKey={getItemKey}
        getItemStatus={getItemStatus}
        renderPill={renderPill}
        entityLabel={singular}
        initialMonth={initialMonth}
        onMonthChange={(month) => {
          onMonthChange?.(month);
          setSelectedDay(null);
        }}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        visibleRange={visibleRange}
        hideNavigation={hideNavigation}
        compact={compact}
        embedded={embedded}
        onDayClick={onDayClick}
        onItemClick={onItemClick}
      />
    );

  if (layout === "grid-only") {
    return (
      <div
        className={cn(
          "min-w-0 transition-opacity duration-300",
          isRefreshing && "opacity-60",
        )}
      >
        {grid}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 lg:grid-cols-3 transition-opacity duration-300",
        isRefreshing && "opacity-60",
      )}
    >
      {grid}

      <CalendarDayDetailPanel
        selectedDay={selectedDay}
        count={selectedDayItems.length}
        entityLabel={singular}
        emptySelectCaption={
          emptySelectCaption ??
          `Click any day to see ${entityLabel} with a stay that night`
        }
        emptyDayCaption={
          emptyDayCaption ??
          `No guest ${entityLabel} are scheduled for this night`
        }
      >
        <div className="space-y-2">
          {selectedDayItems.map((item) => (
            <div key={getItemKey(item)}>{renderDayItem(item)}</div>
          ))}
        </div>
      </CalendarDayDetailPanel>
    </div>
  );
}

/** Status-colored occupancy pill with a custom label (guest first name or net amount). */
export function CalendarOccupancyPill({
  status,
  label,
  title,
  labelClassName,
}: {
  status: string;
  label: string;
  title?: string;
  labelClassName?: string;
}) {
  const tone = statusToneStyle(status);
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 truncate rounded-md border px-1.5 py-0.5",
        "text-[10px] font-semibold leading-tight",
        tone.badge,
      )}
      title={title ?? `${label} · ${statusLabel(status)}`}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone.dot,
          tone.pulse && "motion-safe:animate-pulse",
        )}
      />
      <span className={cn("truncate", labelClassName)}>{label}</span>
    </div>
  );
}
