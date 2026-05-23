/**
 * submit-pay-parking — Public POST to save pay-parking vehicle details and broadcast
 * to parking owners (same email as workflow parking broadcast).
 *
 * Body: { bookingId, carPlateNumber, carBrandModel, carColor, sendParkingBroadcast?, parkingOwnerEmail? }
 * sendParkingBroadcast defaults true; set false for admin update-only (no owner email).
 * parkingOwnerEmail — when set, sends the parking broadcast template to that address only (no BCC list).
 * Parking rate is read from the database only (set by admin before sharing the link).
 * Does not change booking workflow status.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { DatabaseService } from "../_shared/databaseService.ts";
import { CalendarService } from "../_shared/calendarService.ts";
import { SheetsService } from "../_shared/sheetsService.ts";
import { sendParkingBroadcast } from "../_shared/emailService.ts";
import {
  isBookingStatus,
  STATUS_HUMAN_LABEL,
  type BookingStatus,
} from "../_shared/statusMachine.ts";

type SubmitBody = {
  bookingId?: string;
  carPlateNumber?: string;
  carBrandModel?: string;
  carColor?: string;
  /** When false, skip parking owner broadcast (admin update-only). Default true. */
  sendParkingBroadcast?: boolean;
  /** When set, send parking email to this address only (ignores PARKING_OWNER_EMAILS). */
  parkingOwnerEmail?: string;
};

function resolveParkingRateGuest(row: Record<string, unknown>): number {
  const raw = row.parking_rate_guest;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 400;
}

function validateBody(body: SubmitBody): string | null {
  const plate = (body.carPlateNumber ?? "").trim();
  const brand = (body.carBrandModel ?? "").trim();
  const color = (body.carColor ?? "").trim();
  if (!plate) return "Car plate number is required";
  if (!brand) return "Car brand and model is required";
  if (!color) return "Car color is required";
  return null;
}

function buildPaxNights(booking: Record<string, unknown>): {
  pax: number;
  nights: number;
} {
  const pax =
    (Number(booking.number_of_adults) || 1) +
    (Number(booking.number_of_children) || 0);
  const nights = Number(booking.number_of_nights) || 1;
  return { pax, nights };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== "POST") {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = (await req.json().catch(() => null)) as SubmitBody | null;
    const bookingId = (body?.bookingId ?? "").trim();
    if (!bookingId) throw new Error("bookingId is required");

    const validationError = body ? validateBody(body) : "Invalid body";
    if (validationError) throw new Error(validationError);

    const existing = await DatabaseService.getBookingById(bookingId);
    if (!existing) throw new Error("Booking not found");
    if (existing.status === "CANCELLED") {
      throw new Error("This booking was cancelled — parking cannot be added");
    }

    const parkingRateGuest = resolveParkingRateGuest(
      existing as Record<string, unknown>,
    );

    const patch: Record<string, unknown> = {
      need_parking: true,
      car_plate_number: (body!.carPlateNumber ?? "").trim().toUpperCase(),
      car_brand_model: (body!.carBrandModel ?? "").trim(),
      car_color: (body!.carColor ?? "").trim(),
      parking_rate_guest: parkingRateGuest,
    };

    const updated = await DatabaseService.setWorkflowFields(bookingId, patch);

    const shouldSendBroadcast = body!.sendParkingBroadcast !== false;
    const parkingOwnerEmail = (body!.parkingOwnerEmail ?? "").trim();

    let broadcastResult: unknown = null;
    let broadcastSent = false;
    let sentToOwnerEmail: string | null = null;
    try {
      if (parkingOwnerEmail) {
        broadcastResult = await sendParkingBroadcast(updated, {
          to: parkingOwnerEmail,
        });
        broadcastSent = broadcastResult !== null;
        sentToOwnerEmail = broadcastSent ? parkingOwnerEmail : null;
      } else if (shouldSendBroadcast) {
        broadcastResult = await sendParkingBroadcast(updated);
        broadcastSent = broadcastResult !== null;
      }
    } catch (broadcastErr) {
      console.error(
        "[submit-pay-parking] Parking broadcast failed:",
        broadcastErr,
      );
      throw new Error(
        "Parking details were saved but the owner broadcast email failed. Please ask your host to resend from the admin dashboard.",
      );
    }

    const rawStatus = updated.status as string;
    if (isBookingStatus(rawStatus)) {
      const status = rawStatus as BookingStatus;
      const { pax, nights } = buildPaxNights(
        updated as Record<string, unknown>,
      );
      const guestName = String(updated.guest_facebook_name ?? "");
      const statusLabel = STATUS_HUMAN_LABEL[status];
      try {
        await CalendarService.updateCalendarEventStatus(
          bookingId,
          status,
          pax,
          nights,
          guestName,
          updated,
        );
        await SheetsService.syncFullRowFromDbBooking(updated, statusLabel);
      } catch (syncErr) {
        console.warn(
          "[submit-pay-parking] Calendar/sheet sync failed (non-fatal):",
          syncErr,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bookingId,
          broadcastSent,
          sentToOwnerEmail,
          broadcastResult,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[submit-pay-parking]", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
