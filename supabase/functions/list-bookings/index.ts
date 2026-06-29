/**
 * list-bookings — Admin paginated booking list.
 */

import { DatabaseService } from "../_shared/databaseService.ts";
import { jsonResponse } from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

serveAdmin("list-bookings", async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams;

  const q = p.get("q") ?? "";
  const statusRaw = p.getAll("status");
  const from = p.get("from") ?? null;
  const to = p.get("to") ?? null;
  const hasPets =
    p.get("has_pets") === "true"
      ? true
      : p.get("has_pets") === "false"
        ? false
        : null;
  const needParking =
    p.get("need_parking") === "true"
      ? true
      : p.get("need_parking") === "false"
        ? false
        : null;
  const showCompletedBookings =
    p.get("show_completed_bookings") === "true" ||
    p.get("show_previous_bookings") === "true" ||
    p.get("hide_stale_completed") === "false";
  const sort = (p.get("sort") ?? "status_priority:asc") as
    | "status_priority:asc"
    | "check_in_date:asc"
    | "check_in_date:desc"
    | "created_at:asc"
    | "created_at:desc";
  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(p.get("limit") ?? "31", 10)),
  );

  const { rows, total } = await DatabaseService.listBookings({
    q,
    status: statusRaw,
    from,
    to,
    hasPets,
    needParking,
    sort,
    page,
    limit,
    showCompletedBookings,
  });

  return jsonResponse(req, { success: true, data: rows, total, page, limit });
});
