/**
 * org-settings — Admin GET/PATCH for organization-scoped operator config.
 */

import { DatabaseService } from '../_shared/databaseService.ts';
import {
  ensureOrgSettingsRow,
  invalidateOrgSettingsCache,
  serializeOrgSettingsForAdmin,
} from '../_shared/orgSettings.ts';
import {
  invalidateAppSettingsCache,
  validateOptionalUrl,
  validateRequiredUrl,
} from '../_shared/appSettings.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { serveAdmin } from '../_shared/serveEdge.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';

serveAdmin('org-settings', async (req) => {
  if (req.method === 'GET') {
    const ctx = await resolveOrgAccessContext(req, 'org:settings:view');
    await ensureOrgSettingsRow(ctx.org.id);
    const data = await serializeOrgSettingsForAdmin(ctx.org.id);
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const ctx = await resolveOrgAccessContext(req, 'org:settings:edit');
    const organizationId = ctx.org.id;
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = {};

    if (typeof body.airbnbUrl === 'string') {
      const trimmed = body.airbnbUrl.trim();
      if (trimmed) {
        const err = validateOptionalUrl(trimmed, 'Airbnb URL');
        if (err) return jsonError(req, err);
        patch.airbnb_url = trimmed;
      } else {
        patch.airbnb_url = null;
      }
    }
    if (typeof body.facebookPageUrl === 'string') {
      const trimmed = body.facebookPageUrl.trim();
      const err = validateRequiredUrl(trimmed, 'Facebook page URL', 'Enter Facebook page URL');
      if (err) return jsonError(req, err);
      patch.facebook_reviews_url = trimmed;
    } else if (typeof body.facebookReviewsUrl === 'string') {
      const trimmed = body.facebookReviewsUrl.trim();
      const err = validateRequiredUrl(trimmed, 'Facebook page URL', 'Enter Facebook page URL');
      if (err) return jsonError(req, err);
      patch.facebook_reviews_url = trimmed;
    }
    if (typeof body.instagramUrl === 'string') {
      const trimmed = body.instagramUrl.trim();
      if (trimmed) {
        const err = validateOptionalUrl(trimmed, 'Instagram URL');
        if (err) return jsonError(req, err);
        patch.instagram_url = trimmed;
      } else {
        patch.instagram_url = null;
      }
    }
    if (typeof body.tiktokUrl === 'string') {
      const trimmed = body.tiktokUrl.trim();
      if (trimmed) {
        const err = validateOptionalUrl(trimmed, 'TikTok URL');
        if (err) return jsonError(req, err);
        patch.tiktok_url = trimmed;
      } else {
        patch.tiktok_url = null;
      }
    }
    if (typeof body.emailLogoUrl === 'string') {
      const trimmed = body.emailLogoUrl.trim();
      if (trimmed) {
        return jsonError(req, 'Team logo can only be updated via upload-org-settings-asset');
      }
      patch.email_logo_url = null;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(req, 'No valid fields to update');
    }

    await ensureOrgSettingsRow(organizationId);
    await DatabaseService.updateOrgSettings(patch, organizationId);
    if (patch.email_logo_url === null) {
      await createServiceClient()
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organizationId);
    }
    invalidateOrgSettingsCache(organizationId);
    invalidateAppSettingsCache();
    const data = await serializeOrgSettingsForAdmin(organizationId);
    return jsonSuccess(req, data);
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
