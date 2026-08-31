import type { OptimizePreset } from '@/lib/media/imageOptimizationPlan';
import { prepareImageForUpload } from '@/lib/media/prepareImageForUpload';
import {
  formatMaxBytesError,
  UPLOAD_MAX_BYTES,
  type UploadLimitKind,
} from '@/lib/media/uploadLimits';

export type PrepareUploadOptions = {
  imagePreset: OptimizePreset;
  surface: string;
};

export type PrepareUploadResult = {
  file: File;
  error?: string;
};

function classifyKind(file: File, preset: OptimizePreset): UploadLimitKind {
  const mime = (file.type || '').trim().toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|ogv|mpeg|mpg)$/.test(name)) {
    return 'video';
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (preset === 'AVATAR') return 'avatar';
  if (preset === 'DOCUMENT') return 'document';
  return 'image';
}

/**
 * Client-side size check + image compression before any upload request.
 * `surface` is reserved for logging / future telemetry.
 */
export async function prepareUpload(
  file: File,
  options: PrepareUploadOptions
): Promise<PrepareUploadResult> {
  void options.surface;
  const kind = classifyKind(file, options.imagePreset);
  const next =
    kind === 'video' || kind === 'pdf'
      ? file
      : await prepareImageForUpload(file, options.imagePreset);

  const max = UPLOAD_MAX_BYTES[kind];
  if (next.size > max) {
    return { file: next, error: formatMaxBytesError(max) };
  }
  return { file: next };
}
