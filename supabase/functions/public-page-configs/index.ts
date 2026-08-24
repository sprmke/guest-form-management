/**
 * public-page-configs — Admin GET/PATCH for public page section configs.
 * Auth: serveAuthenticated + resolveScopedPropertyAccess
 * Plan gate: PATCH only, `publicPagesAutosave` (Starter+) — viewing/editing in the UI is
 * free on every tier; only persisting a save requires the entitlement.
 */

import { catchPlanFeatureError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import {
  getOrCreatePublicPageConfig,
  parsePublicPageType,
  upsertPublicPageConfig,
} from '../_shared/publicPageConfigs.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('public-page-configs', async (req) => {
  const permission = req.method === 'GET' ? 'templates:view' : 'templates:edit';
  const { property } = await resolveScopedPropertyAccess(req, permission);

  if (req.method === 'PATCH') {
    try {
      await requirePropertyFeature(property.id, 'publicPagesAutosave');
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const pageType = parsePublicPageType(url.searchParams.get('page_type'));
    if (!pageType) {
      return jsonError(req, 'page_type must be stay_guide or property_landing', 400);
    }

    const row = await getOrCreatePublicPageConfig(property.id, pageType);
    return jsonSuccess(req, {
      pageType: row.pageType,
      config: row.config,
      updatedAt: row.updatedAt,
    });
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const pageType = parsePublicPageType(body.pageType ?? body.page_type);
    if (!pageType) {
      return jsonError(req, 'pageType must be stay_guide or property_landing', 400);
    }
    if (body.config === undefined) {
      return jsonError(req, 'config is required', 400);
    }

    const row = await upsertPublicPageConfig(property.id, pageType, body.config);
    return jsonSuccess(req, {
      pageType: row.pageType,
      config: row.config,
      updatedAt: row.updatedAt,
    });
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
