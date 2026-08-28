/**
 * get-public-parking — Public GET for guest marketing parking detail.
 * Query: ?parking=<slug>
 */

import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { checkIpRateLimit, clientIpFromRequest } from '../_shared/publicRateLimit.ts';
import { loadPublicParkingBySlug, readParkingSlugFromUrl } from '../_shared/parkingScope.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('get-public-parking', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  // Phase 8 — this GET is the landing resolution for the direct-booking link (a scrapeable
  // public URL, unlike the rest of the marketplace which requires guest sign-in before any
  // write). Same throttle shape as search-suggestions.
  const ip = clientIpFromRequest(req);
  const rate = checkIpRateLimit('get-public-parking', ip, 60, 60_000);
  if (!rate.allowed) {
    return jsonError(req, 'Too many requests. Please wait a moment.', 429);
  }

  const url = new URL(req.url);
  const slug = readParkingSlugFromUrl(url);

  if (!slug) {
    return jsonError(req, 'parking query param is required', 400);
  }

  const detail = await loadPublicParkingBySlug(slug);

  if (!detail) {
    return jsonError(req, 'Parking not found', 404);
  }

  return jsonSuccess(req, detail);
});
