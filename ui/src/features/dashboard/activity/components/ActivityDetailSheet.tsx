import type { ReactNode } from 'react';

import {
  activityActorLabel,
  activityCategoryLabel,
  ACTIVITY_SEVERITY_META,
  type ActivityEvent,
} from '@/features/dashboard/activity/lib/activityCatalog';
import {
  activityAbsoluteTime,
  formatChangeValue,
  humanizeAction,
} from '@/features/dashboard/activity/lib/activityFormat';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Props = {
  event: ActivityEvent | null;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

export function ActivityDetailSheet({ event, onOpenChange }: Props) {
  const meta = event ? ACTIVITY_SEVERITY_META[event.severity] : null;

  return (
    <Sheet open={Boolean(event)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {event && meta && (
          <>
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-base">{event.summary}</SheetTitle>
              <SheetDescription>
                {humanizeAction(event.action)} · {activityCategoryLabel(event.category)}
              </SheetDescription>
            </SheetHeader>

            <div className="divide-border/60 mt-4 divide-y">
              <Field
                label="Severity"
                value={
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', meta.badge)}>
                    {meta.label}
                  </span>
                }
              />
              <Field
                label="Actor"
                value={
                  <>
                    {event.actorDisplayName ||
                      event.actorEmail ||
                      activityActorLabel(event.actorType)}
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({activityActorLabel(event.actorType)}
                      {event.actorRole ? ` · ${event.actorRole}` : ''})
                    </span>
                  </>
                }
              />
              <Field label="When" value={activityAbsoluteTime(event.createdAt)} />
              <Field label="Source" value={event.source.replace(/_/g, ' ')} />
              <Field label="Target" value={event.targetLabel ?? event.targetId} />
              <Field label="From" value={event.ipPrefix} />
              {event.userAgent && (
                <Field
                  label="Device"
                  value={<span className="text-muted-foreground text-xs">{event.userAgent}</span>}
                />
              )}
            </div>

            {event.changes && event.changes.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-medium">Changes</h3>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Field</th>
                        <th className="px-3 py-2 text-left font-medium">From</th>
                        <th className="px-3 py-2 text-left font-medium">To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y">
                      {event.changes.map((c) => (
                        <tr key={c.field}>
                          <td className="px-3 py-2 align-top font-medium">
                            {c.field.replace(/_/g, ' ')}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 align-top">
                            {formatChangeValue(c.from)}
                          </td>
                          <td className="px-3 py-2 align-top">{formatChangeValue(c.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {Object.keys(event.metadata ?? {}).length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-medium">Details</h3>
                <pre className="bg-muted/30 overflow-x-auto rounded-lg border p-3 text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
