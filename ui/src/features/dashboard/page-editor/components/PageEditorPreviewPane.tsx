import { useCallback, useState, type ReactNode } from 'react';

import { Monitor, Smartphone } from 'lucide-react';

import {
  PreviewViewportProvider,
  type PreviewViewport,
} from '@/features/guest/lib/previewViewportContext';

import { useMarketingSidebarLayout } from '@/features/dashboard/marketing/hooks/useMarketingSidebarLayout';
import { usePageEditorPreviewScroll } from '@/features/dashboard/page-editor/lib/pageEditorPreviewScroll';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PageEditorPreviewViewport = PreviewViewport;

type Props = {
  children: ReactNode;
  className?: string;
  defaultViewport?: PageEditorPreviewViewport;
};

function PreviewFrame({
  viewport,
  children,
}: {
  viewport: PageEditorPreviewViewport;
  children: ReactNode;
}) {
  const api = usePageEditorPreviewScroll();

  const setScrollRoot = useCallback(
    (el: HTMLDivElement | null) => {
      api?.registerScrollRoot(el);
    },
    [api]
  );

  if (viewport === 'mobile') {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <div
          ref={setScrollRoot}
          className="border-border bg-background relative mx-auto h-[min(780px,calc(100dvh-12rem))] w-full max-w-[420px] transform-gpu overflow-y-auto overflow-x-hidden border shadow-sm transition-[max-width] duration-300 ease-out"
        >
          <PreviewViewportProvider value={viewport}>{children}</PreviewViewportProvider>
        </div>
      </div>
    );
  }

  return (
    <div ref={setScrollRoot} className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      <div className="border-border bg-background mx-auto min-h-full w-full max-w-[1280px] overflow-x-hidden border shadow-sm transition-[max-width] duration-300 ease-out">
        <PreviewViewportProvider value={viewport}>{children}</PreviewViewportProvider>
      </div>
    </div>
  );
}

/** Scrollable guest-page preview with desktop / mobile viewport toggle. */
export function PageEditorPreviewPane({ children, className, defaultViewport = 'mobile' }: Props) {
  const [viewport, setViewport] = useState<PageEditorPreviewViewport>(defaultViewport);
  const { setCollapsed } = useMarketingSidebarLayout('page-editor');

  const selectDesktop = () => {
    setViewport('desktop');
    setCollapsed(true);
  };

  const selectMobile = () => {
    setViewport('mobile');
    setCollapsed(false);
  };

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b py-1.5 pl-9 pr-3 sm:pl-10 sm:pr-4">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Preview
        </span>
        <div className="flex items-center gap-0.5" role="group" aria-label="Preview viewport">
          <Button
            type="button"
            variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            aria-label="Desktop preview"
            aria-pressed={viewport === 'desktop'}
            onClick={selectDesktop}
          >
            <Monitor className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            aria-label="Mobile preview"
            aria-pressed={viewport === 'mobile'}
            onClick={selectMobile}
          >
            <Smartphone className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <PreviewFrame viewport={viewport}>{children}</PreviewFrame>
    </div>
  );
}
