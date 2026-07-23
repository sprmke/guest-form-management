import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';

export type DesignPresetThumbnailCaptureFn = (
  templateId: string,
  binding: DesignBinding
) => Promise<string | null>;

let capturePresetFn: DesignPresetThumbnailCaptureFn | null = null;

export function registerDesignPresetThumbnailCapture(fn: DesignPresetThumbnailCaptureFn) {
  capturePresetFn = fn;
  return () => {
    if (capturePresetFn === fn) capturePresetFn = null;
  };
}

export function isDesignPresetThumbnailCaptureReady(): boolean {
  return capturePresetFn != null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** Requires a mounted capture handler (see MarketingPolotnoThumbnailHost). */
export async function captureDesignPresetThumbnail(
  templateId: string,
  binding: DesignBinding,
  signal?: AbortSignal
): Promise<string | null> {
  // Phase 1: wait for host to mount (up to 4 seconds in 50ms steps)
  const hostWaitSteps = 80;
  for (let attempt = 0; attempt < hostWaitSteps; attempt += 1) {
    if (signal?.aborted) return null;
    if (capturePresetFn) break;
    try {
      await sleep(50, signal);
    } catch {
      return null;
    }
  }

  if (!capturePresetFn) return null;

  // Phase 2: attempt capture — retry once if paint not ready, but stop if host disappears
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (signal?.aborted || !capturePresetFn) return null;
    const dataUrl = await capturePresetFn(templateId, binding);
    if (dataUrl) return dataUrl;
    if (signal?.aborted || !capturePresetFn) return null;
    try {
      await sleep(150, signal);
    } catch {
      return null;
    }
  }

  return null;
}
