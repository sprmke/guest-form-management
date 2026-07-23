import { forwardRef } from 'react';

import { getBackgroundStyle } from '@/features/dashboard/marketing/components/calendar-builder/components/controls/BackgroundControl';
import type { CalendarStyles } from '@/features/dashboard/marketing/components/calendar-builder/types';
import {
  CALENDAR_CANVAS_DIMENSIONS,
  computeCalendarSquareSize,
  normalizeCalendarCanvasFrame,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';

type Props = {
  styles: CalendarStyles;
  children: (calendarSize: number) => React.ReactNode;
};

export const CalendarCanvasFrame = forwardRef<HTMLDivElement, Props>(function CalendarCanvasFrame(
  { styles, children },
  ref
) {
  const frame = normalizeCalendarCanvasFrame(styles.canvasFrame);
  const dims = CALENDAR_CANVAS_DIMENSIONS[frame.format];
  const calendarSize = computeCalendarSquareSize(
    dims.width,
    dims.height,
    frame.padding,
    frame.calendarScale
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: dims.width,
        height: dims.height,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: frame.padding,
        overflow: 'hidden',
        flexShrink: 0,
        ...getBackgroundStyle(frame.background),
      }}
    >
      <div
        style={{
          width: calendarSize,
          height: calendarSize,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children(calendarSize)}
      </div>
    </div>
  );
});
