import { ChevronRight } from 'lucide-react';

import {
  activityActorLabel,
  activityCategoryIcon,
  ACTIVITY_SEVERITY_META,
  type ActivityEvent,
} from '@/features/dashboard/activity/lib/activityCatalog';
import {
  activityAbsoluteTime,
  activityRelativeTime,
  changeSummary,
} from '@/features/dashboard/activity/lib/activityFormat';

import { cn } from '@/lib/utils';

type Props = {
  event: ActivityEvent;
  onSelect: (event: ActivityEvent) => void;
};

export function ActivityRow({ event, onSelect }: Props) {
  const Icon = activityCategoryIcon(event.category);
  const severity = ACTIVITY_SEVERITY_META[event.severity];
  const actor =
    event.actorDisplayName?.trim() ||
    event.actorEmail?.trim() ||
    activityActorLabel(event.actorType);
  const changes = changeSummary(event.changes);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors',
        'hover:border-border hover:bg-muted/40 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
        'min-h-[44px]'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          event.severity === 'destructive'
            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-foreground text-sm">{event.summary}</span>
          {event.severity !== 'info' && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] font-medium leading-none',
                severity.badge
              )}
            >
              {severity.label}
            </span>
          )}
        </span>
        <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="text-foreground/70 font-medium">{actor}</span>
          <span aria-hidden>·</span>
          <span title={activityAbsoluteTime(event.createdAt)}>
            {activityRelativeTime(event.createdAt)}
          </span>
          {event.targetLabel && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{event.targetLabel}</span>
            </>
          )}
          {changes && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{changes}</span>
            </>
          )}
        </span>
      </span>

      <ChevronRight className="text-muted-foreground/50 mt-1.5 h-4 w-4 shrink-0" />
    </button>
  );
}
