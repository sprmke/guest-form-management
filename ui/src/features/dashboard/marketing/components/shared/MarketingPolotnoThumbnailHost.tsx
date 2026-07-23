import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { WorkspaceWrap } from 'openpolotno';
import Workspace from 'openpolotno/canvas/workspace';

import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import { registerDesignPresetThumbnailCapture } from '@/features/dashboard/marketing/lib/designPresetThumbnailCapture';
import { yieldToMainThread } from '@/features/dashboard/marketing/lib/marketingIdle';
import { ensurePolotnoConfigured } from '@/features/dashboard/marketing/lib/polotno/initPolotno';
import { buildPolotnoCampaignDocument } from '@/features/dashboard/marketing/lib/polotno/polotnoCampaignDocuments';
import {
  createPolotnoStore,
  type PolotnoStore,
} from '@/features/dashboard/marketing/lib/polotno/polotnoStore';
import { polotnoWorkspaceChrome } from '@/features/dashboard/marketing/lib/polotno/polotnoWorkspaceTheme';
import { syncPolotnoTextBounds } from '@/features/dashboard/marketing/lib/polotno/syncPolotnoTextBounds';
import { renderDesignStoreThumbnail } from '@/features/dashboard/marketing/lib/renderMarketingDesignThumbnail';

type CaptureRequest = {
  templateId: string;
  binding: DesignBinding;
  resolve: (dataUrl: string | null) => void;
};

async function waitForCanvasPaint(): Promise<void> {
  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
  ]);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
}

type Props = {
  onMount?: () => void;
};

/**
 * Off-screen Polotno workspace — preset thumbnails need a mounted `<Workspace />`.
 * Mirrors MarketingCalendarThumbnailHost: mount workspace only while capturing so
 * we never keep two live Polotno stages on the canvas at once.
 */
export function MarketingPolotnoThumbnailHost({ onMount }: Props) {
  const storeRef = useRef<PolotnoStore | null>(null);
  const queueRef = useRef<CaptureRequest[]>([]);
  const runningRef = useRef(false);
  const [activeRequest, setActiveRequest] = useState<CaptureRequest | null>(null);
  const workspaceChrome = polotnoWorkspaceChrome(false);

  if (!storeRef.current) {
    ensurePolotnoConfigured();
    storeRef.current = createPolotnoStore();
  }
  const store = storeRef.current;

  const finishTask = useCallback(() => {
    runningRef.current = false;
    void yieldToMainThread().then(() => {
      const next = queueRef.current.shift();
      if (next) {
        runningRef.current = true;
        setActiveRequest(next);
      } else {
        setActiveRequest(null);
      }
    });
  }, []);

  const enqueueCapture = useCallback(
    (templateId: string, binding: DesignBinding) =>
      new Promise<string | null>((resolve) => {
        queueRef.current.push({ templateId, binding, resolve });
        if (runningRef.current) return;
        runningRef.current = true;
        setActiveRequest(queueRef.current[0] ?? null);
      }),
    []
  );

  useLayoutEffect(() => {
    onMount?.();
    const unregister = registerDesignPresetThumbnailCapture((templateId, binding) =>
      enqueueCapture(templateId, binding)
    );
    return () => {
      unregister();
      for (const pending of queueRef.current) {
        pending.resolve(null);
      }
      queueRef.current = [];
      runningRef.current = false;
      setActiveRequest(null);
      (storeRef.current as { destroy?: () => void } | null)?.destroy?.();
      storeRef.current = null;
    };
  }, [enqueueCapture, onMount]);

  useEffect(() => {
    if (!activeRequest) return;

    let settled = false;
    const settle = (dataUrl: string | null) => {
      if (settled) return;
      settled = true;
      activeRequest.resolve(dataUrl);
      finishTask();
    };

    let cancelled = false;

    void (async () => {
      await yieldToMainThread();
      if (cancelled) return;

      // Let `<Workspace />` mount and register its Konva stage before loading JSON.
      await waitForCanvasPaint();
      if (cancelled) return;

      try {
        const doc = buildPolotnoCampaignDocument(activeRequest.templateId, activeRequest.binding);
        if (!doc) {
          settle(null);
          return;
        }

        store.loadJSON(doc);
        store.history.clear();
        await store.waitLoading();
        await syncPolotnoTextBounds(store);
        await waitForCanvasPaint();

        if (cancelled) return;

        const dataUrl = await renderDesignStoreThumbnail(store);
        settle(dataUrl);
      } catch {
        settle(null);
      }
    })();

    return () => {
      cancelled = true;
      if (!settled) settle(null);
    };
  }, [activeRequest, finishTask, store]);

  return (
    <div
      className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] h-[720px] w-[405px] overflow-hidden opacity-0"
      aria-hidden
    >
      {activeRequest ? (
        <WorkspaceWrap className="h-full w-full">
          <Workspace store={store as never} {...workspaceChrome} />
        </WorkspaceWrap>
      ) : null}
    </div>
  );
}
