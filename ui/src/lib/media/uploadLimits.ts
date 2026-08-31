/**
 * Client mirror of `supabase/functions/_shared/uploadLimits.ts`.
 * Keep numbers and `formatMaxBytesError` in lockstep with the edge copy.
 */

export const UPLOAD_MAX_BYTES = {
  /** Photos, gallery, marketing, generic content images. */
  image: 10 * 1024 * 1024,
  /** Avatars, logos, small icons. */
  avatar: 5 * 1024 * 1024,
  /** ID / receipt / vaccination / signature images — near-lossless handling. */
  document: 12 * 1024 * 1024,
  /** PDF documents (never compressed). */
  pdf: 12 * 1024 * 1024,
  /** Video (never transcoded). */
  video: 50 * 1024 * 1024,
} as const;

export type UploadLimitKind = keyof typeof UPLOAD_MAX_BYTES;

/** Canonical "too large" message — must match the edge `formatMaxBytesError`. */
export function formatMaxBytesError(maxBytes: number): string {
  return `File must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller`;
}

export function formatUploadLimit(kind: UploadLimitKind): string {
  return `${Math.round(UPLOAD_MAX_BYTES[kind] / (1024 * 1024))} MB`;
}

export function assertWithinUploadLimit(file: { size: number }, kind: UploadLimitKind): void {
  const max = UPLOAD_MAX_BYTES[kind];
  if (file.size > max) {
    throw new Error(formatMaxBytesError(max));
  }
}
