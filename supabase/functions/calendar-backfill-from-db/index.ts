/**
 * calendar-backfill-from-db — admin one-shot / batch Google Calendar repair.
 *
 * Re-applies each booking's DB status, title, color, description, and stay window
 * (check-in/out times) to its Google Calendar event. Fixes:
 *   - 2:00 AM start when DB check-in is 2:00 PM (legacy time parsing)
 *   - Stale titles (e.g. READY FOR CHECK-IN while status = COMPLETED)
 *
 * POST + admin JWT. Body (all optional):
 *   dryRun?: boolean           — default true (preview only)
 *   limit?: number             — default 300, max 1000
 *   statuses?: string[]        — default all except CANCELLED
 *   bookingIds?: string[]      — scope to specific rows
 *   onlyCompleted?: boolean    — shorthand for statuses: ['COMPLETED']
 *   delayMs?: number           — pause between API calls (default 100)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { CalendarService } from '../_shared/calendarService.ts';
import {
  buildCalendarSummary,
  isBookingStatus,
  type BookingStatus,
} from '../_shared/statusMachine.ts';
import { formatTime } from '../_shared/utils.ts';

type BackfillRequest = {
  dryRun?: boolean;
  limit?: number;
  statuses?: string[];
  bookingIds?: string[];
  /** When true, only `COMPLETED` rows (status drift on calendar). */
  onlyCompleted?: boolean;
  delayMs?: number;
};

type RowResult = {
  bookingId: string;
  status: string;
  guestName: string;
  checkInTime: string;
  action:
    | 'patched'
    | 'created'
    | 'not_found'
    | 'skipped_credentials'
    | 'failed'
    | 'dry_run_would_patch'
    | 'dry_run_not_found'
    | 'unsupported_status';
  error?: string;
  beforeSummary?: string;
  beforeStart?: string;
  plannedSummary?: string;
};

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function buildPaxNights(booking: Record<string, unknown>): { pax: number; nights: number } {
  const pax =
    (Number(booking.number_of_adults) || 1) + (Number(booking.number_of_children) || 0);
  const nights = Number(booking.number_of_nights) || 1;
  return { pax, nights };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = (await req.json().catch(() => ({}))) as BackfillRequest;
    const dryRun = body.dryRun !== false;
    const limit = Math.min(Math.max(body.limit ?? 300, 1), 1000);
    const delayMs = Math.min(Math.max(body.delayMs ?? 100, 0), 2000);
    const statuses = body.onlyCompleted
      ? ['COMPLETED']
      : (body.statuses?.length ? body.statuses : null);
    const bookingIds = body.bookingIds?.filter(Boolean) ?? [];

    if (!CalendarService.isConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Calendar credentials are not configured (GOOGLE_SERVICE_ACCOUNT / GOOGLE_CALENDAR_ID).',
        }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const supabase = supabaseAdmin();
    let query = supabase
      .from('guest_submissions')
      .select('*')
      .order('check_in_date', { ascending: false })
      .limit(limit);

    if (bookingIds.length > 0) {
      query = query.in('id', bookingIds);
    } else if (statuses?.length) {
      query = query.in('status', statuses);
    } else {
      query = query.neq('status', 'CANCELLED');
    }

    const { data: rows, error: queryError } = await query;
    if (queryError) throw new Error(queryError.message);

    const bookings = rows ?? [];
    const results: RowResult[] = [];
    let patched = 0;
    let created = 0;
    let notFound = 0;
    let failed = 0;
    let wouldPatch = 0;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const bookingId = String(booking.id);
      const rawStatus = String(booking.status ?? '');

      if (!isBookingStatus(rawStatus)) {
        results.push({
          bookingId,
          status: rawStatus,
          guestName: String(booking.guest_facebook_name ?? ''),
          checkInTime: String(booking.check_in_time ?? ''),
          action: 'unsupported_status',
        });
        continue;
      }

      const status = rawStatus as BookingStatus;
      const { pax, nights } = buildPaxNights(booking as Record<string, unknown>);
      const guestName = String(booking.guest_facebook_name ?? '');
      const plannedSummary = buildCalendarSummary(status, pax, nights, guestName, booking);
      const checkInTime = formatTime(booking.check_in_time) || String(booking.check_in_time ?? '');

      try {
        if (dryRun) {
          const eventId = await CalendarService.findEventIdForBooking(bookingId, booking);
          if (!eventId) {
            notFound++;
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'dry_run_not_found',
              plannedSummary,
            });
          } else {
            const snap = await CalendarService.getCalendarEventSnapshot(eventId);
            wouldPatch++;
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'dry_run_would_patch',
              beforeSummary: snap?.summary,
              beforeStart: snap?.startDateTime,
              plannedSummary,
            });
          }
        } else {
          const eventIdBefore = await CalendarService.findEventIdForBooking(bookingId, booking);
          const snapBefore = eventIdBefore
            ? await CalendarService.getCalendarEventSnapshot(eventIdBefore)
            : null;

          const outcome = await CalendarService.updateCalendarEventStatus(
            bookingId,
            status,
            pax,
            nights,
            guestName,
            booking,
          );

          if (outcome.skipped) {
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'skipped_credentials',
            });
            continue;
          }

          if (outcome.created) {
            created++;
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'created',
              beforeSummary: snapBefore?.summary,
              beforeStart: snapBefore?.startDateTime,
              plannedSummary,
            });
          } else if (outcome.updated > 0) {
            patched++;
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'patched',
              beforeSummary: snapBefore?.summary,
              beforeStart: snapBefore?.startDateTime,
              plannedSummary,
            });
          } else {
            notFound++;
            results.push({
              bookingId,
              status: rawStatus,
              guestName,
              checkInTime,
              action: 'not_found',
              plannedSummary,
            });
          }
        }
      } catch (err) {
        failed++;
        results.push({
          bookingId,
          status: rawStatus,
          guestName,
          checkInTime,
          action: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (delayMs > 0 && i < bookings.length - 1) {
        await sleep(delayMs);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        scanned: bookings.length,
        summary: {
          patched,
          created,
          notFound,
          failed,
          wouldPatch: dryRun ? wouldPatch : undefined,
        },
        results,
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in calendar-backfill-from-db:', error);
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
