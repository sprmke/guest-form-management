import { useLayoutEffect, useRef, useState } from 'react';

import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { ActivityRow } from '@/features/dashboard/activity/components/ActivityRow';
import type { ActivityEvent } from '@/features/dashboard/activity/lib/activityCatalog';

import { cn } from '@/lib/utils';

const VIRTUALIZE_THRESHOLD = 30;
const ESTIMATED_ROW_PX = 72;

type Props = {
  events: ActivityEvent[];
  onSelect: (event: ActivityEvent) => void;
  variant?: 'default' | 'compact';
  className?: string;
};

export function ActivityFeedList({ events, onSelect, variant = 'default', className }: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listOffsetTop, setListOffsetTop] = useState(0);
  const virtualize = events.length >= VIRTUALIZE_THRESHOLD;

  useLayoutEffect(() => {
    if (!listRef.current || !virtualize) return;
    const measure = () => setListOffsetTop(listRef.current?.offsetTop ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [virtualize, events.length]);

  const virtualizer = useWindowVirtualizer({
    count: virtualize ? events.length : 0,
    estimateSize: () => ESTIMATED_ROW_PX,
    overscan: 10,
    getItemKey: (index) => events[index]?.id ?? index,
    scrollMargin: listOffsetTop,
  });

  if (events.length === 0) return null;

  const rowClassName =
    variant === 'compact'
      ? 'border-border/40 border-b last:border-b-0'
      : 'border-border/50 border-b last:border-b-0';

  return (
    <div
      ref={listRef}
      className={cn(variant === 'default' && 'surface-card overflow-hidden', className)}
    >
      {virtualize ? (
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((item) => {
            const event = events[item.index];
            if (!event) return null;
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className={cn('absolute left-0 top-0 w-full', rowClassName)}
                style={{
                  transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <ActivityRow event={event} onSelect={onSelect} variant={variant} />
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {events.map((event) => (
            <div key={event.id} className={rowClassName}>
              <ActivityRow event={event} onSelect={onSelect} variant={variant} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
