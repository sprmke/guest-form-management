/**
 * custom-pages-settings — Admin GET/PATCH for a property's Custom Pages rows.
 * Auth: publicPages:view | publicPages.stayGuide:edit / publicPages.showcase:edit (PATCH template)
 * Plan gate: PATCH stay_guide / property_showcase template → `publicPagesAutosave` (Pro+).
 * Guest live Showcase URL still requires `propertyShowcase` (see get-public-showcase).
 * Both page types select from the same 6 `showcase-*` template keys.
 */

import { catchPlanFeatureError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import {
  type CustomPageType,
  getOrCreateCustomPage,
  isShowcaseTemplateKey,
  parseCustomPageType,
  SHOWCASE_TEMPLATE_KEYS,
  updateCustomPageTemplate,
} from '../_shared/customPages.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import type { TeamPermissionId } from '../_shared/propertyTeamPermissions.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function templateEditPermission(pageType: CustomPageType): TeamPermissionId {
  return pageType === 'stay_guide' ? 'publicPages.stayGuide:edit' : 'publicPages.showcase:edit';
}

function templatePlanFeature(): 'publicPagesAutosave' {
  return 'publicPagesAutosave';
}

serveAuthenticated('custom-pages-settings', async (req) => {
  if (req.method === 'GET') {
    const { property } = await resolveScopedPropertyAccess(req, 'publicPages:view');

    const stayGuide = await getOrCreateCustomPage(property.id, 'stay_guide');
    const showcase = await getOrCreateCustomPage(property.id, 'property_showcase');

    return jsonSuccess(req, {
      pages: [
        {
          pageType: stayGuide.pageType,
          templateKey: stayGuide.templateKey,
          updatedAt: stayGuide.updatedAt,
        },
        {
          pageType: showcase.pageType,
          templateKey: showcase.templateKey,
          updatedAt: showcase.updatedAt,
        },
      ],
    });
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const pageType = parseCustomPageType(body.pageType ?? body.page_type);
    if (!pageType) {
      return jsonError(req, 'pageType must be stay_guide or property_showcase', 400);
    }

    const templateKey =
      typeof body.templateKey === 'string'
        ? body.templateKey
        : typeof body.template_key === 'string'
          ? body.template_key
          : '';
    if (!isShowcaseTemplateKey(templateKey)) {
      return jsonError(
        req,
        `templateKey must be one of: ${SHOWCASE_TEMPLATE_KEYS.join(', ')}`,
        400
      );
    }

    const { property } = await resolveScopedPropertyAccess(req, templateEditPermission(pageType));
    try {
      await requirePropertyFeature(property.id, templatePlanFeature());
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }

    const row = await updateCustomPageTemplate(property.id, pageType, templateKey);
    return jsonSuccess(req, {
      pageType: row.pageType,
      templateKey: row.templateKey,
      updatedAt: row.updatedAt,
    });
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
