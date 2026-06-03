/**
 * Shared shell for workflow rail sub-forms (`WorkflowPanel`) — matches the
 * **Guest SD refund form** card: rounded border, header strip, padded body.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Merged with default body padding; include vertical rhythm, e.g. `space-y-4`. */
  bodyClassName?: string;
};

export function WorkflowSubFormCard({
  title,
  description,
  children,
  bodyClassName,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-slate-950/[0.04]">
      <div className="border-b border-separator bg-muted/50/80 px-4 py-3.5 sm:px-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className={cn('px-4 py-3.5 sm:px-5', bodyClassName ?? 'space-y-3')}>
        {children}
      </div>
    </div>
  );
}
