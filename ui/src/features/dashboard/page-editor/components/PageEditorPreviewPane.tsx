import { useCallback, useState, type ReactNode } from 'react';

import { Monitor, Smartphone } from 'lucide-react';

import {
  PreviewViewportProvider,
  type PreviewViewport,
} from '@/features/guest/lib/previewViewportContext';

import { MarketingEditorHistoryControls } from '@/features/dashboard/marketing/components/shared/MarketingEditorHistoryControls';
import { useMarketingSidebarLayout } from '@/features/dashboard/marketing/hooks/useMarketingSidebarLayout';
import { usePageEditorPreviewScroll } from '@/features/dashboard/page-editor/lib/pageEditorPreviewScroll';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PageEditorPreviewViewport = PreviewViewport;

type Props = {
  children: ReactNode;
  className?: string;
  defaultViewport?: PageEditorPreviewViewport;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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

  // Scroll root must be the bordered frame (not the padded outer). Showcase uses
  // position:sticky inside contained chrome; scrolling the padded wrapper pins the
  // header in the gutter and looks broken on desktop.
  if (viewport === 'mobile') {
    return (
      <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <div
          ref={setScrollRoot}
          className="border-border bg-background relative isolate mx-auto h-[min(780px,calc(100dvh-12rem))] w-full max-w-[420px] overflow-y-auto overflow-x-clip border shadow-sm transition-[max-width] duration-300 ease-out"
        >
          <PreviewViewportProvider value={viewport}>{children}</PreviewViewportProvider>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
      <div
        ref={setScrollRoot}
        className="border-border bg-background relative isolate mx-auto min-h-0 w-full max-w-[1280px] flex-1 overflow-y-auto overflow-x-clip border shadow-sm transition-[max-width] duration-300 ease-out"
      >
        <PreviewViewportProvider value={viewport}>{children}</PreviewViewportProvider>
      </div>
    </div>
  );
}

/** Scrollable guest-page preview with desktop / mobile viewport toggle. */
export function PageEditorPreviewPane({
  children,
  className,
  defaultViewport = 'mobile',
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
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
      <div className="border-border flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b py-2 pl-9 pr-3 sm:pl-10 sm:pr-4">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Preview
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="border-border bg-muted/30 flex items-center gap-0.5 rounded-lg border p-0.5"
            role="group"
            aria-label="Preview viewport"
          >
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
          <div className="bg-border hidden h-8 w-px sm:block" aria-hidden />
          <MarketingEditorHistoryControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        </div>
      </div>
      <PreviewFrame viewport={viewport}>{children}</PreviewFrame>
    </div>
  );
}
