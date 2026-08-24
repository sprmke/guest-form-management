/**
 * guest-web-chat-resume — Resume an existing web chat thread for a property or parking listing.
 * Auth: any signed-in guest (Supabase JWT, not admin allow list).
 */

import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resumeGuestWebChat } from '../_shared/webGuestChatService.ts';

serveAuthenticated('guest-web-chat-resume', async (req, user) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const url = new URL(req.url);
  const propertySlug = String(
    url.searchParams.get('property_slug') ?? url.searchParams.get('propertySlug') ?? ''
  ).trim();
  const parkingSlug = String(
    url.searchParams.get('parking_slug') ?? url.searchParams.get('parkingSlug') ?? ''
  ).trim();

  if ((!propertySlug && !parkingSlug) || (propertySlug && parkingSlug)) {
    return jsonError(req, 'Exactly one of property_slug or parking_slug is required', 400);
  }

  try {
    const result = await resumeGuestWebChat(user, {
      propertySlug: propertySlug || undefined,
      parkingSlug: parkingSlug || undefined,
    });
    return jsonSuccess(req, result);
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Property not found' || message === 'Parking not found') {
      return jsonError(req, message, 404);
    }
    throw e;
  }
});
