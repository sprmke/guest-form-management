/**
 * custom-pages-settings — Admin GET for a property's Custom Pages rows.
 * Auth: verifyAdminJwt via resolveScopedPropertyAccess
 * No plan gate: viewing/editing the built-in public pages is free on every tier —
 * only autosave/save is gated (see public-page-configs, feature `publicPagesAutosave`).
 */

import { getOrCreateCustomPage } from '../_shared/customPages.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('custom-pages-settings', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  const { property } = await resolveScopedPropertyAccess(req, 'templates:view');

  const stayGuide = await getOrCreateCustomPage(property.id, 'stay_guide');

  return jsonSuccess(req, {
    pages: [
      {
        pageType: stayGuide.pageType,
        templateKey: stayGuide.templateKey,
        updatedAt: stayGuide.updatedAt,
      },
    ],
  });
});
