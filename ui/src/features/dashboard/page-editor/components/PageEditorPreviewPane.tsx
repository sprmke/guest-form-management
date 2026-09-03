import { useCallback, type ReactNode } from 'react';

import {
  PreviewViewportProvider,
  type PreviewViewport,
} from '@/features/guest/lib/previewViewportContext';

import { usePageEditorPreviewChrome } from '@/features/dashboard/page-editor/lib/pageEditorPreviewChrome';
import { usePageEditorPreviewScroll } from '@/features/dashboard/page-editor/lib/pageEditorPreviewScroll';

import { cn } from '@/lib/utils';

export type PageEditorPreviewViewport = PreviewViewport;

type Props = {
  children: ReactNode;
  className?: string;
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

  const isMobile = viewport === 'mobile';

  // Bordered frame owns height. Scrollport + chrome host are absolute siblings so
  // guest header/menu can portal into the non-scrolling host (clipped, under admin
  // sheets) without using viewport-fixed coords that break when nested.
  return (
    <div className={cn('min-h-0 flex-1 overflow-hidden p-3 sm:p-4', !isMobile && 'flex flex-col')}>
      <div
        className={cn(
          'border-border bg-background relative isolate w-full overflow-hidden border shadow-sm',
          isMobile
            ? 'mx-auto h-[min(780px,calc(100dvh-12rem))] max-w-[420px]'
            : 'mx-auto min-h-0 max-w-[1280px] flex-1'
        )}
      >
        <div
          ref={setScrollRoot}
          data-page-editor-preview-scroll=""
          className="absolute inset-0 overflow-y-auto overflow-x-clip overscroll-y-contain"
        >
          <PreviewViewportProvider value={viewport}>{children}</PreviewViewportProvider>
        </div>
        <div
          data-page-editor-preview-chrome=""
          className="pointer-events-none absolute inset-0 z-[90] overflow-hidden"
        />
      </div>
    </div>
  );
}

/** Scrollable guest-page preview. Viewport chrome lives on the editor dock / desktop bar. */
export function PageEditorPreviewPane({ children, className }: Props) {
  const { viewport } = usePageEditorPreviewChrome();

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <PreviewFrame viewport={viewport}>{children}</PreviewFrame>
    </div>
  );
}
