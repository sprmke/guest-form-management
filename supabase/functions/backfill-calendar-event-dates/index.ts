/**
 * backfill-calendar-event-dates — one-shot/admin-triggered Google Calendar date-window fix.
 *
 * Purpose:
 *   Multi-night bookings previously ended on checkout morning, so Google Calendar
 *   showed nights + 1 date columns. Re-sync start/end to occupied nights only
 *   (check-in through last night at 23:59) and dedupe duplicate events per booking.
 *
 * Trigger:
 *   Admin-only POST (manual), run once after deploying occupied-night end logic.
 *
 * Body:
 *   { dryRun?: boolean, limit?: number, bookingId?: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { CalendarService } from "../_shared/calendarService.ts";
import { buildGoogleCalendarOccupiedEndDateTime } from "../_shared/utils.ts";
import {
  manilaTodayYmd,
  normalizeBookingDateToYmd,
} from "../_shared/calendarAvailabilityManila.ts";
import {
  jsonResponse,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

type BackfillRequest = {
  dryRun?: boolean;
  limit?: number;
  bookingId?: string;
  /** When true, only stays with check-out today or later (Manila). Default false — includes completed stays. */
  futureStaysOnly?: boolean;
};

function isEligibleForCalendarWindowFix(
  row: { number_of_nights?: number | null; check_out_date?: string | null },
  futureStaysOnly: boolean,
): boolean {
  const nights = Number(row.number_of_nights) || 1;
  if (nights < 2) return false;
  if (!futureStaysOnly) return true;
  const checkoutYmd = normalizeBookingDateToYmd(
    String(row.check_out_date ?? ""),
  );
  if (!checkoutYmd) return false;
  return checkoutYmd >= manilaTodayYmd();
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

serveAdmin("backfill-calendar-event-dates", async (req) => {
  requireHttpMethod(req, "POST");
  const body = (await readJsonBody(req)) as BackfillRequest;
  const dryRun = body.dryRun !== false;
  const limit = Math.min(Math.max(1, Number(body.limit) || 200), 500);
  const scopedBookingId = body.bookingId?.trim() || "";
  const futureStaysOnly = body.futureStaysOnly === true;

  const supabase = supabaseAdmin();
  let query = supabase
    .from("guest_submissions")
    .select("*")
    .not("status", "eq", "CANCELLED")
    .not("status", "eq", "canceled")
    .order("check_in_date", { ascending: true });

  if (scopedBookingId) {
    query = query.eq("id", scopedBookingId);
  } else {
    query = query.gt("number_of_nights", 1);
  }

  const { data: bookings, error } = await query;
  if (error) throw new Error(error.message);

  let rows = bookings ?? [];
  if (scopedBookingId) {
    if (rows.length === 0) {
      throw new Error("Booking not found");
    }
    if ((Number(rows[0].number_of_nights) || 1) < 2) {
      return jsonResponse(req, {
        success: true,
        dryRun,
        count: 0,
        preview: [],
        message:
          "Single-night stays were already correct on Google Calendar — nothing to fix.",
        filter: { multiNightOnly: true, futureStaysOnly: false },
      });
    }
  } else {
    rows = rows.filter((row) =>
      isEligibleForCalendarWindowFix(row, futureStaysOnly),
    );
    rows.sort((a, b) => {
      const aCi =
        normalizeBookingDateToYmd(String(a.check_in_date ?? "")) ?? "";
      const bCi =
        normalizeBookingDateToYmd(String(b.check_in_date ?? "")) ?? "";
      return bCi.localeCompare(aCi);
    });
    rows = rows.slice(0, limit);
  }
  const preview: Array<{
    bookingId: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    newEndDateTime: string;
  }> = [];

  for (const row of rows) {
    const nights = Number(row.number_of_nights) || 1;
    preview.push({
      bookingId: row.id,
      checkIn: String(row.check_in_date ?? ""),
      checkOut: String(row.check_out_date ?? ""),
      nights,
      newEndDateTime: buildGoogleCalendarOccupiedEndDateTime(
        String(row.check_in_date ?? ""),
        String(row.check_out_date ?? "").trim() || undefined,
        nights,
      ),
    });
  }

  if (dryRun) {
    return jsonResponse(req, {
      success: true,
      dryRun: true,
      count: preview.length,
      preview,
      filter: {
        multiNightOnly: !scopedBookingId,
        futureStaysOnly: scopedBookingId ? false : futureStaysOnly,
      },
      message:
        preview.length === 0
          ? "No multi-night stays need a calendar window fix."
          : undefined,
    });
  }

  const results: Array<{
    bookingId: string;
    success: boolean;
    updated: number;
    deleted: number;
    skipped?: boolean;
    created?: boolean;
    error?: string;
  }> = [];

  for (const row of rows) {
    const outcome = await CalendarService.resyncCalendarEventWindow(
      row.id,
      row,
    );
    results.push({ bookingId: row.id, ...outcome });
  }

  const summary = {
    total: results.length,
    updated: results.filter((r) => r.updated > 0).length,
    created: results.filter((r) => r.created).length,
    skipped: results.filter((r) => r.skipped).length,
    deletedDuplicates: results.reduce((sum, r) => sum + r.deleted, 0),
    failed: results.filter((r) => !r.success).length,
  };

  return jsonResponse(req, {
    success: true,
    dryRun: false,
    summary,
    results,
    filter: {
      multiNightOnly: !scopedBookingId,
      futureStaysOnly: scopedBookingId ? false : futureStaysOnly,
    },
  });
});
