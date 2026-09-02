import { DatabaseService } from '../_shared/databaseService.ts';
import { canGuestPublicUpdateForm } from '../_shared/statusMachine.ts';
import { extractRouteParam } from '../_shared/utils.ts';
import { jsonError, jsonResponse, requireHttpMethod } from '../_shared/httpResponse.ts';
import { checkIpRateLimit, clientIpFromRequest } from '../_shared/publicRateLimit.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('get-form', async (req) => {
  requireHttpMethod(req, 'GET');

  // This returns full guest PII by bookingId alone — throttle brute-force/enumeration
  // attempts. Not a substitute for the token-based access control tracked separately
  // (docs/workflow/in-progress/production-readiness-hardening.md Phase 2).
  const ip = clientIpFromRequest(req);
  const rate = checkIpRateLimit('get-form', ip, 30, 60_000);
  if (!rate.allowed) {
    return jsonError(req, 'Too many requests. Please wait a moment.', 429);
  }

  const url = new URL(req.url);
  const bookingId = extractRouteParam(url.pathname, '/get-form/');

  if (!bookingId) {
    throw new Error('bookingId is required');
  }

  const formData = await DatabaseService.getFormData(bookingId);

  if (!formData) {
    return jsonResponse(
      req,
      {
        success: false,
        error: 'Booking not found',
        message: 'No booking found with the provided ID',
      },
      404
    );
  }

  const row = await DatabaseService.getBookingById(bookingId);
  const guestCanUpdate = canGuestPublicUpdateForm(row?.status);

  return jsonResponse(req, {
    success: true,
    data: formData,
    status: row?.status ?? null,
    guestCanUpdate,
    message: 'Form data retrieved successfully.',
  });
});
