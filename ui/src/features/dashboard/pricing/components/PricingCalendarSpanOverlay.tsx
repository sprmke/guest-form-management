import type { ReactNode } from 'react';

import type { OccupancySegment } from '@/features/dashboard/bookings/components/calendar/calendarDateUtils';

import { cn } from '@/lib/utils';

const LANE_HEIGHT_PX = 28;
const LANE_GAP_PX = 4;

type Props<T> = {
  segments: OccupancySegment<T>[];
  getSegmentKey: (segment: OccupancySegment<T>) => string;
  renderSegment: (segment: OccupancySegment<T>) => ReactNode;
  maxLanes?: number;
  gapClassName?: string;
};

/** Spanning booking pills overlaid and vertically centered on a week row grid. */
export function PricingCalendarSpanOverlay<T>({
  segments,
  getSegmentKey,
  renderSegment,
  maxLanes = 3,
  gapClassName = 'gap-1.5 sm:gap-2',
}: Props<T>) {
  if (segments.length === 0) return null;

  const laneCount = Math.max(...segments.map((segment) => segment.lane)) + 1;
  const visibleLanes = Math.min(laneCount, maxLanes);
  const overflow = laneCount > maxLanes ? laneCount - maxLanes : 0;

  const lanes = Array.from({ length: visibleLanes }, (_, lane) =>
    segments.filter((segment) => segment.lane === lane)
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-center">
      <div className="flex w-full flex-col" style={{ gap: LANE_GAP_PX }}>
        {lanes.map((laneSegments, laneIndex) => (
          <div
            key={laneIndex}
            className={cn('relative grid grid-cols-7', gapClassName)}
            style={{ height: LANE_HEIGHT_PX }}
          >
            {laneSegments.map((segment) => (
              <div
                key={getSegmentKey(segment)}
                className="pointer-events-none flex min-w-0 items-stretch px-1.5 sm:px-2"
                style={{
                  gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
                }}
              >
                {renderSegment(segment)}
              </div>
            ))}
            {overflow > 0 && laneIndex === visibleLanes - 1 ? (
              <div
                className="text-muted-foreground pointer-events-none flex items-center justify-end pr-0.5 text-[9px] font-bold tabular-nums"
                style={{ gridColumn: '7 / 8' }}
              >
                +{overflow}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
