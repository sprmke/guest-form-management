/**
 * sync-booking-integrations — Refresh Google Calendar + Sheets after admin save.
 */

import { DatabaseService } from '../_shared/databaseService.ts';
import { refreshGuestStayGuideAccessWindow } from '../_shared/guestStayGuide.ts';
import { CalendarService } from '../_shared/calendarService.ts';
import { SheetsService } from '../_shared/sheetsService.ts';
import {
  isBookingStatus,
  STATUS_HUMAN_LABEL,
  type BookingStatus,
} from '../_shared/statusMachine.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import {
  resolveScopedPropertyAccess,
  verifyBookingBelongsToProperty,
} from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function buildPaxNights(booking: Record<string, unknown>): {
  pax: number;
  nights: number;
} {
  const pax = (Number(booking.number_of_adults) || 1) + (Number(booking.number_of_children) || 0);
  const nights = Number(booking.number_of_nights) || 1;
  return { pax, nights };
}

serveAuthenticated('sync-booking-integrations', async (req) => {
  requireHttpMethod(req, 'POST');
  const { property } = await resolveScopedPropertyAccess(req, 'bookings:edit');
  const propertyId = property.id;
  const body = await readJsonBody(req);
  const bookingId = body?.bookingId as string | undefined;
  if (!bookingId) throw new Error('bookingId is required');

  await verifyBookingBelongsToProperty(bookingId, propertyId);

  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) {
    return jsonError(req, 'Booking not found', 404);
  }

  const rawStatus = booking.status as string;
  if (!isBookingStatus(rawStatus)) {
    throw new Error(`Cannot sync Google integrations: unsupported status "${rawStatus}"`);
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
    booking
  );

  const sheet = await SheetsService.syncFullRowFromDbBooking(booking, statusLabel);

  try {
    await refreshGuestStayGuideAccessWindow(booking);
  } catch (err) {
    console.error('[sync-booking-integrations] stay guide window refresh failed (non-fatal):', err);
  }

  return jsonSuccess(req, { calendar, sheet });
});
