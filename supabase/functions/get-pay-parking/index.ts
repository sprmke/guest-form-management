/**
 * get-pay-parking — Public read-only payload for the Pay Parking form.
 *
 * GET ?bookingId=<uuid>
 * Returns booking summary + existing parking vehicle fields when the booking exists
 * and is not CANCELLED.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import { countStayNights } from "../_shared/utils.ts";
import { resolveAppSettings } from "../_shared/appSettings.ts";
import { jsonResponse, jsonSuccess } from "../_shared/httpResponse.ts";
import { servePublic } from "../_shared/serveEdge.ts";

const NOT_FOUND = {
  success: false,
  error: "not_found",
  message:
    "This form is not available. Please use the link from your host or contact us on Facebook.",
};

function defaultParkingRate(
  row: Record<string, unknown>,
  fallbackRate: number,
): number {
  const raw = row.parking_rate_guest;
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return fallbackRate;
}

function hasSubmittedParking(row: Record<string, unknown>): boolean {
  return (
    row.need_parking === true &&
    typeof row.car_plate_number === "string" &&
    row.car_plate_number.trim() !== "" &&
    typeof row.car_brand_model === "string" &&
    row.car_brand_model.trim() !== "" &&
    typeof row.car_color === "string" &&
    row.car_color.trim() !== ""
  );
}

servePublic("get-pay-parking", async (req) => {
  if (req.method !== "GET") {
    throw new Error(`Method ${req.method} not allowed`);
  }

  const url = new URL(req.url);
  const bookingId = (url.searchParams.get("bookingId") ?? "").trim();
  if (!bookingId) {
    return jsonResponse(req, NOT_FOUND, 404);
  }

  const row = await DatabaseService.getBookingById(bookingId);
  if (!row || row.status === "CANCELLED") {
    return jsonResponse(req, NOT_FOUND, 404);
  }

  const pax =
    (Number(row.number_of_adults) || 1) + (Number(row.number_of_children) || 0);

  const parkingCheckIn =
    (row.parking_check_in_date as string | null)?.trim() || row.check_in_date;
  const parkingCheckOut =
    (row.parking_check_out_date as string | null)?.trim() || row.check_out_date;
  const numberOfParkingNights =
    countStayNights(parkingCheckIn, parkingCheckOut) ||
    Number(row.number_of_nights) ||
    1;

  const settings = await resolveAppSettings();

  return jsonSuccess(req, {
    bookingId: row.id,
    primary_guest_name: row.primary_guest_name ?? row.guest_facebook_name ?? "",
    guest_facebook_name: row.guest_facebook_name ?? "",
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    check_in_time: row.check_in_time ?? "14:00",
    check_out_time: row.check_out_time ?? "11:00",
    number_of_nights: Number(row.number_of_nights) || 1,
    number_of_adults: Number(row.number_of_adults) || 1,
    number_of_children: Number(row.number_of_children) || 0,
    pax,
    parking_rate_guest: defaultParkingRate(
      row as Record<string, unknown>,
      settings.defaultParkingRateGuest,
    ),
    parking_check_in_date: parkingCheckIn,
    parking_check_out_date: parkingCheckOut,
    number_of_parking_nights: numberOfParkingNights,
    car_plate_number: row.car_plate_number ?? "",
    car_brand_model: row.car_brand_model ?? "",
    car_color: row.car_color ?? "",
    already_submitted: hasSubmittedParking(row as Record<string, unknown>),
    status: row.status,
  });
});
