/**
 * guest-web-chat-start — Create or resume a web chat thread for a property inquiry.
 * Auth: any signed-in guest (Supabase JWT, not admin allow list).
 */

import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { startGuestWebChat } from '../_shared/webGuestChatService.ts';

serveAuthenticated('guest-web-chat-start', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const body = await readJsonBody(req);
  const propertySlug = String(body.propertySlug ?? body.property_slug ?? '').trim();
  const checkInDate = String(body.checkInDate ?? body.check_in_date ?? '').trim();
  const checkOutDate = String(body.checkOutDate ?? body.check_out_date ?? '').trim();

  if (!propertySlug || !checkInDate || !checkOutDate) {
    return jsonError(req, 'propertySlug, checkInDate, and checkOutDate required', 400);
  }

  try {
    const result = await startGuestWebChat(user, { propertySlug, checkInDate, checkOutDate });
    return jsonSuccess(req, result);
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Property not found') {
      return jsonError(req, message, 404);
    }
    if (message.includes('checkInDate')) {
      return jsonError(req, message, 400);
    }
    throw e;
  }
});
