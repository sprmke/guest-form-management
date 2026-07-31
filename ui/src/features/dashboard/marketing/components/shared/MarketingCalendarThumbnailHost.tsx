import { useCallback, useEffect, useRef, useState } from 'react';

import { toBlob } from 'html-to-image';

import { CalendarCanvasFrame } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarCanvasFrame';
import { CalendarPreview } from '@/features/dashboard/marketing/components/calendar-builder/components/CalendarPreview';
import { resolveCalendarPresetStylesForFormat } from '@/features/dashboard/marketing/components/calendar-builder/stores/calendar-builder-store';
import type {
  CalendarStyles,
  PreviewBooking,
} from '@/features/dashboard/marketing/components/calendar-builder/types';
import {
  CALENDAR_CANVAS_DIMENSIONS,
  calendarPreviewWidthForFormat,
  normalizeCalendarCanvasFrame,
  type CalendarCanvasFormat,
} from '@/features/dashboard/marketing/lib/calendarCanvasFormats';
import { marketingHtmlToImageOptions } from '@/features/dashboard/marketing/lib/marketingHtmlToImageOptions';
import { yieldToMainThread } from '@/features/dashboard/marketing/lib/marketingIdle';

type CaptureRequest = {
  styles: CalendarStyles;
  propertyName: string;
  resolve: (dataUrl: string | null) => void;
};

type CapturePresetRequest = {
  presetId: string;
  propertyName: string;
  format: CalendarCanvasFormat;
  brandColor?: string;
  propertyPhotoUrl?: string;
  resolve: (dataUrl: string | null) => void;
};

let capturePresetFn:
  | ((
      presetId: string,
      propertyName: string,
      format: CalendarCanvasFormat,
      brandColor?: string,
      propertyPhotoUrl?: string
    ) => Promise<string | null>)
  | null = null;
let captureStylesFn:
  ((styles: CalendarStyles, propertyName: string) => Promise<string | null>) | null = null;
let captureLiveFn: ((propertyName: string) => Promise<string | null>) | null = null;

export function registerCalendarPresetThumbnailCapture(
  fn: (
    presetId: string,
    propertyName: string,
    format: CalendarCanvasFormat,
    brandColor?: string,
    propertyPhotoUrl?: string
  ) => Promise<string | null>
) {
  capturePresetFn = fn;
  return () => {
    if (capturePresetFn === fn) capturePresetFn = null;
  };
}

export function registerCalendarStylesThumbnailCapture(
  fn: (styles: CalendarStyles, propertyName: string) => Promise<string | null>
) {
  captureStylesFn = fn;
  return () => {
    if (captureStylesFn === fn) captureStylesFn = null;
  };
}

export function registerCalendarLiveThumbnailCapture(
  fn: (propertyName: string) => Promise<string | null>
) {
  captureLiveFn = fn;
  return () => {
    if (captureLiveFn === fn) captureLiveFn = null;
  };
}

export async function captureCalendarPresetThumbnail(
  presetId: string,
  propertyName: string,
  format: CalendarCanvasFormat,
  brandColor?: string,
  propertyPhotoUrl?: string
): Promise<string | null> {
  if (!capturePresetFn) return null;
  return capturePresetFn(presetId, propertyName, format, brandColor, propertyPhotoUrl);
}

export async function captureCalendarStylesThumbnail(
  styles: CalendarStyles,
  propertyName: string
): Promise<string | null> {
  if (!captureStylesFn) return null;
  return captureStylesFn(styles, propertyName);
}

export async function captureCalendarLiveThumbnail(propertyName: string): Promise<string | null> {
  if (!captureLiveFn) return null;
  return captureLiveFn(propertyName);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function captureNode(node: HTMLElement): Promise<string | null> {
  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
  ]);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const blob = await toBlob(
    node,
    marketingHtmlToImageOptions({
      cacheBust: false,
      pixelRatio: 0.35,
      type: 'image/jpeg',
      quality: 0.68,
    })
  );
  if (!blob) return null;
  return blobToDataUrl(blob);
}

type Props = {
  propertyName: string;
  liveCaptureRef?: React.RefObject<HTMLDivElement | null>;
  previewBookings?: PreviewBooking[];
  previewMonth?: Date;
  onMount?: () => void;
};

function CalendarThumbnailPreview({
  styles,
  propertyName,
  captureRef,
  previewBookings = [],
  previewMonth,
}: {
  styles: CalendarStyles;
  propertyName: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
  previewBookings?: PreviewBooking[];
  previewMonth?: Date;
}) {
  const frame = normalizeCalendarCanvasFrame(styles.canvasFrame);
  const dims = CALENDAR_CANVAS_DIMENSIONS[frame.format];
  const previewWidth = calendarPreviewWidthForFormat(frame.format);
  const scale = previewWidth / dims.width;

  return (
    <div
      style={{
        width: previewWidth,
        height: dims.height * scale,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: dims.width,
          height: dims.height,
        }}
      >
        <CalendarCanvasFrame ref={captureRef} styles={styles}>
          {(calendarSize) => (
            <CalendarPreview
              styles={styles}
              propertyName={propertyName}
              bookings={previewBookings}
              displayMonth={previewMonth}
              layoutMaxWidth={calendarSize}
            />
          )}
        </CalendarCanvasFrame>
      </div>
    </div>
  );
}

export function MarketingCalendarThumbnailHost({
  propertyName,
  liveCaptureRef,
  previewBookings = [],
  previewMonth,
  onMount,
}: Props) {
  const offscreenRef = useRef<HTMLDivElement>(null);
  const [presetRequest, setPresetRequest] = useState<CapturePresetRequest | null>(null);
  const [stylesRequest, setStylesRequest] = useState<CaptureRequest | null>(null);
  const queueRef = useRef<Array<() => void>>([]);
  const runningRef = useRef(false);

  const enqueue = useCallback((task: () => void) => {
    queueRef.current.push(task);
    if (runningRef.current) return;

    const runNext = async () => {
      const next = queueRef.current.shift();
      if (!next) {
        runningRef.current = false;
        return;
      }
      runningRef.current = true;
      next();
    };

    runningRef.current = true;
    void runNext();
  }, []);

  const finishTask = useCallback(() => {
    runningRef.current = false;
    void yieldToMainThread().then(() => {
      const next = queueRef.current.shift();
      if (next) {
        runningRef.current = true;
        next();
      }
    });
  }, []);

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  useEffect(() => {
    return () => {
      queueRef.current = [];
      runningRef.current = false;
      setPresetRequest(null);
      setStylesRequest(null);
    };
  }, []);

  useEffect(() => {
    const capturePreset = (
      presetId: string,
      name: string,
      format: CalendarCanvasFormat,
      brandColor?: string,
      propertyPhotoUrl?: string
    ) =>
      new Promise<string | null>((resolve) => {
        enqueue(() => {
          setPresetRequest({
            presetId,
            propertyName: name,
            format,
            brandColor,
            propertyPhotoUrl,
            resolve: (dataUrl) => {
              resolve(dataUrl);
              setPresetRequest(null);
              finishTask();
            },
          });
        });
      });

    const captureStyles = (styles: CalendarStyles, name: string) =>
      new Promise<string | null>((resolve) => {
        enqueue(() => {
          setStylesRequest({
            styles,
            propertyName: name,
            resolve: (dataUrl) => {
              resolve(dataUrl);
              setStylesRequest(null);
              finishTask();
            },
          });
        });
      });

    const captureLive = (_name: string) =>
      new Promise<string | null>((resolve) => {
        enqueue(async () => {
          const node = liveCaptureRef?.current;
          if (!node) {
            resolve(null);
            finishTask();
            return;
          }
          try {
            resolve(await captureNode(node));
          } catch {
            resolve(null);
          } finally {
            finishTask();
          }
        });
      });

    const unregisterPreset = registerCalendarPresetThumbnailCapture(capturePreset);
    const unregisterStyles = registerCalendarStylesThumbnailCapture(captureStyles);
    const unregisterLive = registerCalendarLiveThumbnailCapture(captureLive);

    return () => {
      unregisterPreset();
      unregisterStyles();
      unregisterLive();
    };
  }, [enqueue, finishTask, liveCaptureRef]);

  useEffect(() => {
    if (!presetRequest || !offscreenRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        const dataUrl = await captureNode(offscreenRef.current!);
        if (!cancelled) presetRequest.resolve(dataUrl);
      } catch {
        if (!cancelled) presetRequest.resolve(null);
      }
    })();

    return () => {
      cancelled = true;
      presetRequest.resolve(null);
    };
  }, [presetRequest]);

  useEffect(() => {
    if (!stylesRequest || !offscreenRef.current) return;

    let cancelled = false;
    void (async () => {
      try {
        const dataUrl = await captureNode(offscreenRef.current!);
        if (!cancelled) stylesRequest.resolve(dataUrl);
      } catch {
        if (!cancelled) stylesRequest.resolve(null);
      }
    })();

    return () => {
      cancelled = true;
      stylesRequest.resolve(null);
    };
  }, [stylesRequest]);

  const offscreenStyles =
    presetRequest != null
      ? resolveCalendarPresetStylesForFormat(
          presetRequest.presetId,
          presetRequest.format,
          presetRequest.brandColor,
          presetRequest.propertyPhotoUrl
        )
      : (stylesRequest?.styles ?? null);

  const offscreenPropertyName =
    presetRequest?.propertyName ?? stylesRequest?.propertyName ?? propertyName;

  return (
    <div className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] opacity-0" aria-hidden>
      {offscreenStyles ? (
        <CalendarThumbnailPreview
          styles={offscreenStyles}
          propertyName={offscreenPropertyName}
          captureRef={offscreenRef}
          previewBookings={previewBookings}
          previewMonth={previewMonth}
        />
      ) : null}
    </div>
  );
}
