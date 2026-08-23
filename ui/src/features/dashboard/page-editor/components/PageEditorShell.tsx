import { useEffect, type ReactNode } from 'react';

import { MarketingEditorSidebar } from '@/features/dashboard/marketing/components/shared/MarketingEditorSidebar';
import { useMarketingSidebarLayout } from '@/features/dashboard/marketing/hooks/useMarketingSidebarLayout';
import { PageEditorPreviewScrollProvider } from '@/features/dashboard/page-editor/lib/pageEditorPreviewScroll';

import { cn } from '@/lib/utils';

const PAGE_EDITOR_SIDEBAR_WIDTH = 480;

type Props = {
  header: ReactNode;
  controls: ReactNode;
  preview: ReactNode;
  className?: string;
};

export function PageEditorShell({ header, controls, preview, className }: Props) {
  const { setCollapsed } = useMarketingSidebarLayout('page-editor');

  // Always open the controls sidebar when entering the editor (mobile preview fits beside it).
  useEffect(() => {
    setCollapsed(false);
  }, [setCollapsed]);

  return (
    <PageEditorPreviewScrollProvider>
      <div
        className={cn(
          'border-border bg-card flex h-[calc(100vh-120px)] min-h-[520px] flex-col overflow-hidden rounded-xl border',
          className
        )}
      >
        {header}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <MarketingEditorSidebar
            layoutKey="page-editor"
            fixedWidth={PAGE_EDITOR_SIDEBAR_WIDTH}
            resizable={false}
          >
            {controls}
          </MarketingEditorSidebar>
          <div className="bg-muted/20 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {preview}
          </div>
        </div>
      </div>
    </PageEditorPreviewScrollProvider>
  );
}
