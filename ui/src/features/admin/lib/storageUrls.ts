import type { BookingRow } from '@/features/admin/lib/types';

function deriveProjectBaseUrl(): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_PROJECT_URL as
    | string
    | undefined;
  if (explicit?.trim()) return explicit.replace(/\/+$/, '');

  const functionsUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!functionsUrl?.trim()) return null;
  return functionsUrl
    .replace(/\/+$/, '')
    .replace(/\/functions\/v1$/, '');
}

const PUBLIC_SUPABASE_BASE_URL = deriveProjectBaseUrl();
const STORAGE_OBJECT_PATH_RE =
  /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;

export const PRIVATE_STORAGE_BUCKETS = new Set([
  'approved-gafs',
  'approved-pet-forms',
  'sd-refund-receipts',
]);

export function normalizeStoragePublicUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!PUBLIC_SUPABASE_BASE_URL) return url;

  // Local Supabase sometimes returns docker-internal hostnames in public URLs.
  // Replace them with the browser-reachable project URL.
  let normalized = url
    .replace(/^http:\/\/kong:8000/, PUBLIC_SUPABASE_BASE_URL)
    .replace(/^http:\/\/supabase_kong_[^/]+:8000/, PUBLIC_SUPABASE_BASE_URL);

  // Repair legacy malformed links accidentally rewritten as:
  // http://127.0.0.1:54321/functions/v1/storage/v1/object/...
  normalized = normalized.replace(
    /^https?:\/\/[^/]+\/functions\/v1\/storage\/v1\//,
    `${PUBLIC_SUPABASE_BASE_URL}/storage/v1/`,
  );

  return normalized;
}

export function parseStorageUrl(
  url: string | null | undefined,
): { bucket: string; path: string } | null {
  if (!url) return null;
  const normalized = normalizeStoragePublicUrl(url) ?? url;
  const match = normalized.match(STORAGE_OBJECT_PATH_RE);
  if (!match) return null;
  const bucket = match[1];
  const rawPath = match[2]?.split('?')[0] ?? '';
  if (!bucket || !rawPath) return null;
  return { bucket, path: decodeURIComponent(rawPath) };
}

export function normalizeBookingStorageUrls(row: BookingRow): BookingRow {
  return {
    ...row,
    valid_id_url: normalizeStoragePublicUrl(row.valid_id_url) ?? null,
    payment_receipt_url: normalizeStoragePublicUrl(row.payment_receipt_url) ?? null,
    pet_vaccination_url: normalizeStoragePublicUrl(row.pet_vaccination_url) ?? null,
    pet_image_url: normalizeStoragePublicUrl(row.pet_image_url) ?? null,
    pdf_url: normalizeStoragePublicUrl(row.pdf_url) ?? null,
    parking_endorsement_url:
      normalizeStoragePublicUrl(row.parking_endorsement_url) ?? null,
    approved_gaf_pdf_url:
      normalizeStoragePublicUrl(row.approved_gaf_pdf_url) ?? null,
    approved_pet_pdf_url:
      normalizeStoragePublicUrl(row.approved_pet_pdf_url) ?? null,
    sd_refund_receipt_url:
      normalizeStoragePublicUrl(row.sd_refund_receipt_url) ?? null,
  };
}
