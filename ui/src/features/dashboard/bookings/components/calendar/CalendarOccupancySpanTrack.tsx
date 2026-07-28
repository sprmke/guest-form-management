import type { ReactNode } from 'react';

import type { OccupancySegment } from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';

import { cn } from '@/lib/utils';

const LANE_HEIGHT_PX = 18;

type Props<T> = {
  segments: OccupancySegment<T>[];
  getSegmentKey: (segment: OccupancySegment<T>) => string;
  renderSegment: (segment: OccupancySegment<T>) => ReactNode;
  maxLanes?: number;
  className?: string;
  hiddenClassName?: string;
};

/** One row of spanning occupancy bars aligned to a 7-column week grid. */
export function CalendarOccupancySpanTrack<T>({
  segments,
  getSegmentKey,
  renderSegment,
  maxLanes = 2,
  className,
  hiddenClassName,
}: Props<T>) {
  if (segments.length === 0) return null;

  const laneCount = Math.max(...segments.map((segment) => segment.lane)) + 1;
  const visibleLanes = Math.min(laneCount, maxLanes);
  const overflow = laneCount > maxLanes ? laneCount - maxLanes : 0;

  return (
    <div
      className={cn('mt-0.5 grid grid-cols-7 gap-1', hiddenClassName, className)}
      style={{ gridTemplateRows: `repeat(${visibleLanes}, ${LANE_HEIGHT_PX}px)` }}
    >
      {segments
        .filter((segment) => segment.lane < maxLanes)
        .map((segment) => (
          <div
            key={getSegmentKey(segment)}
            className="min-w-0"
            style={{
              gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
              gridRow: segment.lane + 1,
            }}
          >
            {renderSegment(segment)}
          </div>
        ))}
      {overflow > 0 ? (
        <div
          className="text-muted-foreground flex items-center justify-end px-1 text-[9px] font-bold"
          style={{ gridColumn: '7 / 8', gridRow: visibleLanes }}
        >
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}
