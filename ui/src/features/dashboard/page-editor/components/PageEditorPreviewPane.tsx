import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Scrollable guest-page preview at a phone-width column (production component tree). */
export function PageEditorPreviewPane({ children, className }: Props) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="text-muted-foreground border-border hidden shrink-0 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide lg:block">
        Preview
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="border-border bg-background mx-auto min-h-full w-full max-w-[420px] border-x shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
