/**
 * Admin batch sync: Google Calendar + Sheet from DB (check-in >= 2026-05-12).
 * Preview compares event title + start time to DB; Apply patches drift (and all duplicates).
 * POST { dryRun?, bookingIds?, onlyCompleted?, onlyNeedsRepair? } + admin JWT.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { CalendarService } from '../_shared/calendarService.ts';
import {
  calendarEventNeedsRepair,
  plannedCalendarStart,
  plannedCalendarSummary,
  repairReasons,
} from '../_shared/calendarRepair.ts';
import { SheetsService } from '../_shared/sheetsService.ts';
import {
  isBookingStatus,
  STATUS_HUMAN_LABEL,
  type BookingStatus,
} from '../_shared/statusMachine.ts';
import { normalizeDateToYYYYMMDD } from '../_shared/utils.ts';

const MIN_CHECK_IN_YMD = '2026-05-12';
const CONCURRENCY = 8;

type Body = {
  dryRun?: boolean;
  bookingIds?: string[];
  onlyCompleted?: boolean;
  /** When true (default), Apply skips rows whose calendar already matches DB. */
  onlyNeedsRepair?: boolean;
};

type RowResult = {
  bookingId: string;
  action:
    | 'needs_repair'
    | 'ok'
    | 'not_found'
    | 'synced'
    | 'skipped_ok'
    | 'unsupported_status'
    | 'failed';
  eventCount?: number;
  reasons?: string[];
  error?: string;
  calendar?: { success: boolean; updated: number; created?: boolean };
  sheet?: boolean;
};

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function buildPaxNights(booking: Record<string, unknown>) {
  const pax = (Number(booking.number_of_adults) || 1) + (Number(booking.number_of_children) || 0);
  return { pax, nights: Number(booking.number_of_nights) || 1 };
}

function checkInOnOrAfterMin(booking: { check_in_date?: string }): boolean {
  const ymd = normalizeDateToYYYYMMDD(String(booking.check_in_date ?? ''));
  return !!ymd && ymd >= MIN_CHECK_IN_YMD;
}

async function assessBookingCalendar(
  booking: Record<string, unknown>,
  status: BookingStatus,
  access: { calendarId: string; accessToken: string },
): Promise<{ eventIds: string[]; needsRepair: boolean; reasons: string[] }> {
  const bookingId = String(booking.id);
  const { pax, nights } = buildPaxNights(booking);
  const guestName = String(booking.guest_facebook_name ?? '');
  const plannedStart = plannedCalendarStart(booking);
  const plannedSummary = plannedCalendarSummary(status, pax, nights, guestName, booking);

  const eventIds = await CalendarService.findAllEventIdsForBooking(bookingId, booking, access);
  if (eventIds.length === 0) {
    return { eventIds: [], needsRepair: false, reasons: [] };
  }

  const reasons = new Set<string>();
  let needsRepair = false;
  for (const eventId of eventIds) {
    const snap = await CalendarService.getCalendarEventSnapshot(eventId, access);
    if (!snap) continue;
    if (calendarEventNeedsRepair(status, plannedSummary, plannedStart, snap)) {
      needsRepair = true;
      for (const r of repairReasons(status, plannedSummary, plannedStart, snap)) {
        reasons.add(r);
      }
    }
  }

  return { eventIds, needsRepair, reasons: [...reasons] };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    await verifyAdminJwt(req);
    if (req.method !== 'POST') throw new Error(`Method ${req.method} not allowed`);

    if (!CalendarService.isConfigured()) {
      throw new Error('Google Calendar credentials not configured');
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const dryRun = body.dryRun !== false;
    const onlyNeedsRepair = body.onlyNeedsRepair !== false;
    const bookingIds = body.bookingIds?.filter(Boolean) ?? [];

    const supabase = supabaseAdmin();
    let query = supabase.from('guest_submissions').select('*').neq('status', 'CANCELLED');

    if (bookingIds.length > 0) {
      query = query.in('id', bookingIds);
    } else if (body.onlyCompleted) {
      query = query.eq('status', 'COMPLETED');
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const bookings = (rows ?? []).filter(checkInOnOrAfterMin);
    const access = await CalendarService.obtainCalendarAccess();
    if (!access) throw new Error('Google Calendar credentials not configured');

    const results = await mapPool(bookings, CONCURRENCY, async (booking): Promise<RowResult> => {
      const bookingId = String(booking.id);
      const rawStatus = String(booking.status ?? '');
      if (!isBookingStatus(rawStatus)) {
        return { bookingId, action: 'unsupported_status' };
      }
      const status = rawStatus as BookingStatus;

      try {
        const assessment = await assessBookingCalendar(booking, status, access);

        if (dryRun) {
          if (assessment.eventIds.length === 0) {
            return { bookingId, action: 'not_found' };
          }
          if (assessment.needsRepair) {
            return {
              bookingId,
              action: 'needs_repair',
              eventCount: assessment.eventIds.length,
              reasons: assessment.reasons,
            };
          }
          return {
            bookingId,
            action: 'ok',
            eventCount: assessment.eventIds.length,
          };
        }

        if (onlyNeedsRepair && assessment.eventIds.length > 0 && !assessment.needsRepair) {
          return {
            bookingId,
            action: 'skipped_ok',
            eventCount: assessment.eventIds.length,
          };
        }

        const { pax, nights } = buildPaxNights(booking);
        const guestName = String(booking.guest_facebook_name ?? '');

        const cal = await CalendarService.updateCalendarEventStatus(
          bookingId,
          status,
          pax,
          nights,
          guestName,
          booking,
        );
        const sheet = await SheetsService.syncFullRowFromDbBooking(
          booking,
          STATUS_HUMAN_LABEL[status],
        );

        if (assessment.eventIds.length === 0 && !cal.created) {
          return { bookingId, action: 'not_found', calendar: cal, sheet: sheet.success };
        }

        return {
          bookingId,
          action: cal.updated > 0 || cal.created ? 'synced' : 'not_found',
          eventCount: assessment.eventIds.length,
          reasons: assessment.reasons,
          calendar: cal,
          sheet: sheet.success,
        };
      } catch (e) {
        return {
          bookingId,
          action: 'failed',
          error: e instanceof Error ? e.message : String(e),
        };
      }
    });

    const summary = {
      scanned: bookings.length,
      needsRepair: results.filter((r) => r.action === 'needs_repair').length,
      alreadyOk: results.filter((r) => r.action === 'ok').length,
      notFound: results.filter((r) => r.action === 'not_found').length,
      synced: results.filter((r) => r.action === 'synced').length,
      skippedOk: results.filter((r) => r.action === 'skipped_ok').length,
      failed: results.filter((r) => r.action === 'failed').length,
    };

    return new Response(
      JSON.stringify({ success: true, dryRun, onlyNeedsRepair, minCheckIn: MIN_CHECK_IN_YMD, summary, results }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
