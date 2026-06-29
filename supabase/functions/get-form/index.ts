import { DatabaseService } from "../_shared/databaseService.ts";
import { extractRouteParam } from "../_shared/utils.ts";
import {
  jsonError,
  jsonResponse,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { servePublic } from "../_shared/serveEdge.ts";

servePublic("get-form", async (req) => {
  requireHttpMethod(req, "GET");

  const url = new URL(req.url);
  const bookingId = extractRouteParam(url.pathname, "/get-form/");

  if (!bookingId) {
    throw new Error("bookingId is required");
  }

  const formData = await DatabaseService.getFormData(bookingId);

  if (!formData) {
    return jsonResponse(
      req,
      {
        success: false,
        error: "Booking not found",
        message: "No booking found with the provided ID",
      },
      404,
    );
  }

  return jsonResponse(req, {
    success: true,
    data: formData,
    message: "Form data retrieved successfully.",
  });
});
