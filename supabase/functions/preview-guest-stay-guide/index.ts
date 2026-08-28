/**
 * preview-guest-stay-guide — Admin GET for stay guide preview with sample booking data.
 *
 * GET ?property_id=…&property=<slug> (optional slug guard)
 * Auth: templates:view
 */

import { loadGuestStayGuidePreview } from '../_shared/guestStayGuide.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('preview-guest-stay-guide', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  const { property } = await resolveScopedPropertyAccess(req, 'publicPages:view');
  const url = new URL(req.url);
  const propertySlug = (url.searchParams.get('property') ?? '').trim() || property.slug;

  const data = await loadGuestStayGuidePreview(property.id, propertySlug);
  if (!data) {
    return jsonError(req, 'Stay guide preview is not available for this property', 404);
  }

  return jsonSuccess(req, { ...data, isPreview: true });
});
