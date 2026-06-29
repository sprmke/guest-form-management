import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { jsonResponse } from "../_shared/httpResponse.ts";
import { servePublic } from "../_shared/serveEdge.ts";

servePublic("get-booked-dates", async (req) => {
  if (req.method !== "GET") {
    throw new Error(`Method ${req.method} not allowed`);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = new Date();

  const { data: bookings, error } = await supabase
    .from("guest_submissions")
    .select("id, check_in_date, check_out_date, status")
    .neq("status", "CANCELLED");

  if (error) {
    console.error("Database error:", error);
    throw new Error("Failed to fetch bookings");
  }

  const parseMMDDYYYY = (dateStr: string): Date | null => {
    try {
      const [month, day, year] = dateStr.split("-");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch {
      return null;
    }
  };

  const normalizeDate = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split("-");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return dateStr;
  };

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const bookedDateRanges =
    bookings
      ?.filter((booking) => {
        if (booking.status === "CANCELLED" || booking.status === "canceled") {
          return false;
        }

        const checkOutDate = parseMMDDYYYY(booking.check_out_date);
        if (!checkOutDate) {
          console.warn(
            `Invalid date format for booking ${booking.id}: ${booking.check_out_date}`,
          );
          return false;
        }
        return checkOutDate >= todayStart;
      })
      .map((booking) => ({
        id: booking.id,
        checkInDate: normalizeDate(booking.check_in_date),
        checkOutDate: normalizeDate(booking.check_out_date),
      })) ?? [];

  return jsonResponse(req, {
    success: true,
    data: bookedDateRanges,
    message: "Future booked dates retrieved successfully.",
  });
});
