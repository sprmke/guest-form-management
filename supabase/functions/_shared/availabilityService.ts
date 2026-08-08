/**
 * Batch availability helpers for public search / listing endpoints.
 *
 * Overlap model (half-open, checkout-exclusive):
 *   existing.checkIn < requested.checkOut && existing.checkOut > requested.checkIn
 *
 * Date strings on guest_submissions may be MM-DD-YYYY or YYYY-MM-DD.
 * property_blocked_dates uses YYYY-MM-DD DATE columns.
 *
 * Reused by search-listings and (later) list-public-properties / list-public-parkings.
 * Do not reimplement conflict logic in those callers.
 */

import { createServiceClient } from './orgAuth.ts';
import { isValidCalendarDateKey } from './propertyBlockedDates.ts';

export type DateRangeYmd = {
  checkIn: string;
  checkOut: string;
};

function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  return null;
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Half-open range overlap: [aStart, aEnd) intersects [bStart, bEnd). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function parseRequestedRange(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): DateRangeYmd | null {
  if (!checkIn || !checkOut) return null;
  if (!isValidCalendarDateKey(checkIn) || !isValidCalendarDateKey(checkOut)) return null;
  const start = parseFlexibleDate(checkIn);
  const end = parseFlexibleDate(checkOut);
  if (!start || !end || !(start < end)) return null;
  return { checkIn, checkOut };
}

function chunkIds<T>(ids: T[], size = 200): T[][] {
  if (ids.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/**
 * Returns property IDs that conflict with the requested stay
 * (active bookings or owner-managed blocks).
 */
export async function loadConflictingPropertyIds(
  propertyIds: string[],
  range: DateRangeYmd
): Promise<Set<string>> {
  const conflicting = new Set<string>();
  if (propertyIds.length === 0) return conflicting;

  const reqStart = toDayStart(parseFlexibleDate(range.checkIn)!);
  const reqEnd = toDayStart(parseFlexibleDate(range.checkOut)!);
  const supabase = createServiceClient();

  for (const ids of chunkIds(propertyIds)) {
    const { data: bookings, error: bookingError } = await supabase
      .from('guest_submissions')
      .select('property_id, check_in_date, check_out_date, status')
      .in('property_id', ids)
      .neq('status', 'CANCELLED');

    if (bookingError) {
      console.error('[availabilityService] property bookings', bookingError);
      throw new Error('Failed to load property availability');
    }

    for (const row of bookings ?? []) {
      if (!row.property_id || row.status === 'CANCELLED') continue;
      const existingStart = parseFlexibleDate(row.check_in_date);
      const existingEnd = parseFlexibleDate(row.check_out_date);
      if (!existingStart || !existingEnd) continue;
      if (rangesOverlap(toDayStart(existingStart), toDayStart(existingEnd), reqStart, reqEnd)) {
        conflicting.add(row.property_id as string);
      }
    }

    const { data: blocks, error: blockError } = await supabase
      .from('property_blocked_dates')
      .select('property_id, start_date, end_date')
      .in('property_id', ids);

    if (blockError) {
      console.error('[availabilityService] property blocks', blockError);
      throw new Error('Failed to load property blocks');
    }

    for (const row of blocks ?? []) {
      if (!row.property_id) continue;
      const blockStart = parseFlexibleDate(String(row.start_date));
      const blockEnd = parseFlexibleDate(String(row.end_date));
      if (!blockStart || !blockEnd) continue;
      if (rangesOverlap(toDayStart(blockStart), toDayStart(blockEnd), reqStart, reqEnd)) {
        conflicting.add(row.property_id as string);
      }
    }
  }

  return conflicting;
}

/**
 * Returns parking IDs that conflict with the requested stay (active parking bookings).
 */
export async function loadConflictingParkingIds(
  parkingIds: string[],
  range: DateRangeYmd
): Promise<Set<string>> {
  const conflicting = new Set<string>();
  if (parkingIds.length === 0) return conflicting;

  const reqStart = toDayStart(parseFlexibleDate(range.checkIn)!);
  const reqEnd = toDayStart(parseFlexibleDate(range.checkOut)!);
  const supabase = createServiceClient();

  for (const ids of chunkIds(parkingIds)) {
    const { data: bookings, error } = await supabase
      .from('guest_submissions')
      .select('parking_id, parking_check_in_date, parking_check_out_date, status')
      .in('parking_id', ids)
      .neq('status', 'CANCELLED');

    if (error) {
      console.error('[availabilityService] parking bookings', error);
      throw new Error('Failed to load parking availability');
    }

    for (const row of bookings ?? []) {
      if (!row.parking_id || row.status === 'CANCELLED') continue;
      const existingStart = parseFlexibleDate(row.parking_check_in_date);
      const existingEnd = parseFlexibleDate(row.parking_check_out_date);
      if (!existingStart || !existingEnd) continue;
      if (rangesOverlap(toDayStart(existingStart), toDayStart(existingEnd), reqStart, reqEnd)) {
        conflicting.add(row.parking_id as string);
      }
    }
  }

  return conflicting;
}
