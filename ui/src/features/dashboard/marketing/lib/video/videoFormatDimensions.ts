import type { VideoFormat } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';

export const VIDEO_FORMAT_DIMENSIONS: Record<
  VideoFormat,
  { width: number; height: number; label: string; aspect: string }
> = {
  'instagram-story': {
    width: 1080,
    height: 1920,
    label: 'Instagram Story / Reel',
    aspect: '9:16',
  },
  'instagram-post': {
    width: 1080,
    height: 1080,
    label: 'Instagram Post',
    aspect: '1:1',
  },
  landscape: {
    width: 1920,
    height: 1080,
    label: 'Landscape',
    aspect: '16:9',
  },
};

/** Preview block (sub-header + player + controls). Timeline sits below this block. */
export const VIDEO_PREVIEW_CONTAINER_MIN_HEIGHT_CLASS = 'min-h-[480px] lg:min-h-[540px]';

/** Muted preview shell (`VideoPreviewWorkspace` root). */
export const VIDEO_PREVIEW_SHELL_MIN_HEIGHT_CLASS =
  'min-h-[380px] lg:min-h-[440px] xl:min-h-[480px]';

export const VIDEO_FORMAT_OPTIONS = (Object.keys(VIDEO_FORMAT_DIMENSIONS) as VideoFormat[]).map(
  (key) => ({
    value: key,
    label: VIDEO_FORMAT_DIMENSIONS[key].label,
    detail: `${VIDEO_FORMAT_DIMENSIONS[key].width} × ${VIDEO_FORMAT_DIMENSIONS[key].height}`,
  })
);

/** Size the preview frame to fit its container while preserving format aspect ratio. */
export function fitVideoPreviewFrameSize(
  containerWidth: number,
  containerHeight: number,
  format: VideoFormat,
  maxWidth: number
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const dims = VIDEO_FORMAT_DIMENSIONS[format];
  const aspect = dims.width / dims.height;

  let width = Math.min(maxWidth, containerWidth);
  let height = width / aspect;

  if (height > containerHeight) {
    height = containerHeight;
    width = height * aspect;
  }

  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}
