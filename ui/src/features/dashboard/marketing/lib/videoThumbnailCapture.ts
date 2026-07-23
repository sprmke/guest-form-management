import {
  waitForMarketingIdle,
  yieldToMainThread,
} from '@/features/dashboard/marketing/lib/marketingIdle';

let pausePlaybackFn: (() => void) | null = null;

export function registerVideoThumbnailPlaybackPause(fn: () => void) {
  pausePlaybackFn = fn;
  return () => {
    if (pausePlaybackFn === fn) pausePlaybackFn = null;
  };
}

/** Pause the live Remotion player before off-thread still renders (avoids web-renderer conflicts). */
export async function runVideoThumbnailCapture<T>(work: () => Promise<T>): Promise<T> {
  pausePlaybackFn?.();
  await waitForMarketingIdle(200);
  await yieldToMainThread();
  return work();
}
