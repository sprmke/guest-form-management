import type { ReactNode } from 'react';

import { MarketingEditorSidebar } from '@/features/dashboard/marketing/components/shared/MarketingEditorSidebar';

import { cn } from '@/lib/utils';

type Props = {
  header: ReactNode;
  controls: ReactNode;
  preview: ReactNode;
  className?: string;
};

export function PageEditorShell({ header, controls, preview, className }: Props) {
  return (
    <div className={cn('bg-background flex h-[calc(100dvh-0px)] min-h-0 flex-col', className)}>
      {header}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <MarketingEditorSidebar layoutKey="page-editor">{controls}</MarketingEditorSidebar>
        <div className="bg-muted/20 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {preview}
        </div>
      </div>
    </div>
  );
}
