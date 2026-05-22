/**
 * Admin batch sync: Google Calendar + Sheet from DB (check-in >= 2026-05-12).
 * POST { dryRun?, bookingIds?, onlyCompleted? } + admin JWT.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { CalendarService } from '../_shared/calendarService.ts';
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

    const results = await mapPool(bookings, CONCURRENCY, async (booking) => {
      const bookingId = String(booking.id);
      const rawStatus = String(booking.status ?? '');
      if (!isBookingStatus(rawStatus)) {
        return { bookingId, action: 'unsupported_status' as const };
      }
      const status = rawStatus as BookingStatus;
      const { pax, nights } = buildPaxNights(booking);
      const guestName = String(booking.guest_facebook_name ?? '');

      try {
        if (dryRun) {
          const eventId = await CalendarService.findEventIdForBooking(bookingId, booking, access ?? undefined);
          return {
            bookingId,
            action: eventId ? ('would_sync' as const) : ('not_found' as const),
          };
        }

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

        return {
          bookingId,
          action: cal.updated > 0 || cal.created
            ? ('synced' as const)
            : ('not_found' as const),
          calendar: cal,
          sheet: sheet.success,
        };
      } catch (e) {
        return {
          bookingId,
          action: 'failed' as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    });

    const summary = {
      scanned: bookings.length,
      wouldSync: results.filter((r) => r.action === 'would_sync').length,
      synced: results.filter((r) => r.action === 'synced').length,
      notFound: results.filter((r) => r.action === 'not_found').length,
      failed: results.filter((r) => r.action === 'failed').length,
    };

    return new Response(
      JSON.stringify({ success: true, dryRun, minCheckIn: MIN_CHECK_IN_YMD, summary, results }),
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
