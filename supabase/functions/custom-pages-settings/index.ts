/**
 * custom-pages-settings — Admin GET for a property's Custom Pages rows.
 * Auth: verifyAdminJwt via resolveScopedPropertyAccess
 * Plan gate: customPages (Starter+)
 */

import { getOrCreateCustomPage } from '../_shared/customPages.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { catchPlanFeatureError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('custom-pages-settings', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }

  const { property } = await resolveScopedPropertyAccess(req, 'templates:view');

  try {
    await requirePropertyFeature(property.id, 'customPages');
  } catch (err) {
    const planErr = catchPlanFeatureError(req, err);
    if (planErr) return planErr;
    throw err;
  }

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
