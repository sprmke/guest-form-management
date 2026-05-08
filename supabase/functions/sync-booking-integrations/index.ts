/**
 * sync-booking-integrations — After admin saves booking details (direct DB patch),
 * refresh Google Calendar + Google Sheets from the latest `guest_submissions` row.
 *
 * POST `{ bookingId }` + admin JWT (verifyAdminJwt).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { CalendarService } from '../_shared/calendarService.ts';
import { SheetsService } from '../_shared/sheetsService.ts';
import {
  isBookingStatus,
  STATUS_HUMAN_LABEL,
  type BookingStatus,
} from '../_shared/statusMachine.ts';

function buildPaxNights(booking: Record<string, unknown>): { pax: number; nights: number } {
  const pax =
    (Number(booking.number_of_adults) || 1) + (Number(booking.number_of_children) || 0);
  const nights = Number(booking.number_of_nights) || 1;
  return { pax, nights };
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

    const body = await req.json().catch(() => ({}));
    const bookingId = body?.bookingId as string | undefined;
    if (!bookingId) throw new Error('bookingId is required');

    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) {
      return new Response(JSON.stringify({ success: false, error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const rawStatus = booking.status as string;
    if (!isBookingStatus(rawStatus)) {
      throw new Error(
        `Cannot sync Google integrations: unsupported status "${rawStatus}"`,
      );
    }

    const status = rawStatus as BookingStatus;
    const { pax, nights } = buildPaxNights(booking as Record<string, unknown>);
    const guestName = String(booking.guest_facebook_name ?? '');
    const statusLabel = STATUS_HUMAN_LABEL[status];

    const calendar = await CalendarService.updateCalendarEventStatus(
      bookingId,
      status,
      pax,
      nights,
      guestName,
      booking,
    );

    const sheet = await SheetsService.syncFullRowFromDbBooking(booking, statusLabel);

    return new Response(
      JSON.stringify({ success: true, data: { calendar, sheet } }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in sync-booking-integrations:', error);
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
