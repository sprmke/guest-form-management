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
  /** Flat layout for dialogs — no nested card chrome. */
  plain?: boolean;
};

export function WorkflowSubFormCard({
  title,
  description,
  children,
  bodyClassName,
  plain = false,
}: Props) {
  if (plain) {
    return <div className={cn('space-y-3', bodyClassName)}>{children}</div>;
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm ring-1 ring-slate-950/[0.04]">
      <div className="border-separator bg-muted/50/80 border-b px-4 py-3.5 sm:px-5">
        <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
          {title}
        </h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{description}</p>
        ) : null}
      </div>
      <div className={cn('px-4 py-3.5 sm:px-5', bodyClassName ?? 'space-y-3')}>{children}</div>
    </div>
  );
}
