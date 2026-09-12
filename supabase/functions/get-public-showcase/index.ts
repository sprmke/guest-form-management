/**
 * get-public-showcase — Public GET for property showcase landing page.
 * Trigger: guest SPA `/properties/:propertySlug/showcase`. Auth: anon (verify_jwt = false).
 * Query: ?property=<slug> or ?property_id=<uuid>
 * Without `propertyShowcase` entitlement → 200 with { planAccessDenied: true }
 * (including preview/embed — host dashboard iframes and Open links must show the lock).
 * Page Editor live canvas uses PreviewOverrideProvider and never hits this endpoint.
 * Unpublished → 200 with { published: false } and no property payload (no data leak).
 */

import {
  getCustomPageTemplateOrDefault,
  SHOWCASE_DEFAULT_TEMPLATE_KEY,
} from '../_shared/customPages.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import {
  getPublicPageConfigOrDefault,
  type PropertyShowcaseConfig,
} from '../_shared/publicPageConfigs.ts';
import { resolveAppSettings } from '../_shared/appSettings.ts';
import { loadGuestFacingContactInfo } from '../_shared/guestContactInfo.ts';
import { isFeatureEnabled } from '../_shared/planFeatures.ts';
import { resolvePropertyEntitlements } from '../_shared/planEntitlements.ts';
import {
  loadPublicPropertyById,
  loadPublicPropertyBySlug,
} from '../_shared/publicPropertyService.ts';
import { readPropertyIdFromUrl, readPropertySlugFromUrl } from '../_shared/propertyScope.ts';
import { servePublic } from '../_shared/serveEdge.ts';
import { publicGetRateLimitGate } from '../_shared/publicEndpointRateLimit.ts';

servePublic('get-public-showcase', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, `Method ${req.method} not allowed`, 405);
  }


  const limited = await publicGetRateLimitGate(req, 'get-public-showcase');
  if (limited) return limited;

  const url = new URL(req.url);
  const propertyIdParam = readPropertyIdFromUrl(url);
  const slug = readPropertySlugFromUrl(url);
  const preview = url.searchParams.get('preview') === '1' || url.searchParams.get('embed') === '1';

  if (!propertyIdParam && !slug) {
    return jsonError(req, 'property or property_id query param is required', 400);
  }

  const detail = propertyIdParam
    ? await loadPublicPropertyById(propertyIdParam)
    : await loadPublicPropertyBySlug(slug!);

  if (!detail) {
    return jsonError(req, 'Property not found', 404);
  }

  const propertyId = detail.id;
  const entitlements = await resolvePropertyEntitlements(propertyId);
  if (!isFeatureEnabled(entitlements, 'propertyShowcase')) {
    return jsonSuccess(req, {
      planAccessDenied: true,
      published: false,
      templateKey: SHOWCASE_DEFAULT_TEMPLATE_KEY,
      config: { version: 1, published: false },
    });
  }

  const config = (await getPublicPageConfigOrDefault(
    propertyId,
    'property_showcase'
  )) as PropertyShowcaseConfig;
  const templateKey = await getCustomPageTemplateOrDefault(propertyId, 'property_showcase');
  const appSettings = await resolveAppSettings(propertyId);
  const guestContact = await loadGuestFacingContactInfo(propertyId, appSettings);

  if (!config.published && !preview) {
    return jsonSuccess(req, {
      published: false,
      templateKey: SHOWCASE_DEFAULT_TEMPLATE_KEY,
      config: { version: 1, published: false },
    });
  }

  return jsonSuccess(req, {
    published: config.published,
    templateKey,
    config,
    property: detail,
    guestContact: {
      contactName: guestContact.contactName,
      contactPhone: guestContact.contactPhone,
      contactEmail: guestContact.contactEmail,
      facebookUrl: guestContact.facebookPageUrl,
      airbnbUrl: guestContact.airbnbUrl,
      instagramUrl: appSettings.instagramUrl || null,
      tiktokUrl: appSettings.tiktokUrl || null,
    },
  });
});
