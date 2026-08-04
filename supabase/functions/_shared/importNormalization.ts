/**
 * Normalize raw CSV cell values into guest_submissions column conventions.
 */

import dayjs from 'https://esm.sh/dayjs@1.11.10';
import customParseFormat from 'https://esm.sh/dayjs@1.11.10/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const KNOWN_BOOKING_SOURCES = ['direct', 'facebook', 'airbnb'] as const;

const DATE_PARSE_FORMATS = [
  'MM-DD-YYYY',
  'M-D-YYYY',
  'MM/DD/YYYY',
  'M/D/YYYY',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'DD-MM-YYYY',
  'D-M-YYYY',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'MMM D, YYYY',
  'MMMM D, YYYY',
  'D MMM YYYY',
  'D MMMM YYYY',
] as const;

/** Lenient free-text date → MM-DD-YYYY (guest_submissions text-date convention). */
export function normalizeImportDate(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  for (const format of DATE_PARSE_FORMATS) {
    const parsed = dayjs(raw, format, true);
    if (parsed.isValid()) return parsed.format('MM-DD-YYYY');
  }

  const loose = dayjs(raw);
  return loose.isValid() ? loose.format('MM-DD-YYYY') : null;
}

/** Strip non-digits from phone numbers — no strict E.164 enforcement. */
export function normalizeImportPhone(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** Best-effort booking_source normalization; unknown values pass through unchanged. */
export function normalizeImportBookingSource(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;

  const lowered = raw.toLowerCase();
  if (lowered.includes('airbnb')) return 'Airbnb';
  if (lowered.includes('facebook') || lowered === 'fb') return 'Facebook';
  if (KNOWN_BOOKING_SOURCES.includes(lowered as (typeof KNOWN_BOOKING_SOURCES)[number])) {
    if (lowered === 'airbnb') return 'Airbnb';
    if (lowered === 'facebook') return 'Facebook';
    return 'Direct';
  }

  return raw;
}

/** Apply field-aware normalization when building mapped_data (preview/commit). */
export function normalizeImportFieldValue(
  targetFieldId: string,
  rawValue: string | null | undefined
): string | null {
  const text = String(rawValue ?? '').trim();
  if (!text) return null;

  switch (targetFieldId) {
    case 'check_in_date':
    case 'check_out_date':
    case 'parking_check_in_date':
    case 'parking_check_out_date':
    case 'pet_vaccination_date':
      return normalizeImportDate(text);
    case 'guest_phone_number':
    case 'owner_contact_number':
      return normalizeImportPhone(text);
    case 'booking_source':
      return normalizeImportBookingSource(text);
    default:
      return text;
  }
}
