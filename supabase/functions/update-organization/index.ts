/**
 * update-organization — PATCH org settings (owner only).
 * Auth: verifyOrgOwner via orgId in body.
 */

import {
  allocateOrganizationSlug,
  createServiceClient,
  serializeOrganization,
  verifyOrgOwner,
} from '../_shared/orgAuth.ts';
import {
  DUPLICATE_ORGANIZATION_NAME_MESSAGE,
  findOrganizationNameConflict,
} from '../_shared/orgNameConflict.ts';
import {
  validateOrgBrandColor,
  validateOrgContactSettingsFields,
  validateOrgDescription,
  validateOrgTagline,
} from '../_shared/orgSettingsValidation.ts';
import { invalidateAppSettingsCache } from '../_shared/appSettings.ts';
import { invalidateOrgBrandColorCache } from '../_shared/orgBrandColor.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('update-organization', async (req, user) => {
  requireHttpMethod(req, 'PATCH');
  const body = await readJsonBody(req);

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  if (!orgId) {
    return jsonError(req, 'orgId is required');
  }

  const { org } = await verifyOrgOwner(req, orgId);

  const patch: Record<string, unknown> = {};
  let settingsPatch: Record<string, unknown> | null = null;

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 120) {
      return jsonError(req, 'Organization name must be 2–120 characters');
    }
    patch.name = name;
  }

  if (typeof body.description === 'string') {
    const descriptionErr = validateOrgDescription(body.description);
    if (descriptionErr) return jsonError(req, descriptionErr);
    patch.description = body.description.trim() || null;
  }

  if (typeof body.logoUrl === 'string') {
    patch.logo_url = body.logoUrl.trim() || null;
  }

  if (typeof body.tagline === 'string') {
    const taglineErr = validateOrgTagline(body.tagline);
    if (taglineErr) return jsonError(req, taglineErr);
    settingsPatch = settingsPatch ?? {};
    settingsPatch.tagline = body.tagline.trim() || null;
  }

  if (typeof body.brandColor === 'string') {
    const brandColorErr = validateOrgBrandColor(body.brandColor);
    if (brandColorErr) return jsonError(req, brandColorErr);
    settingsPatch = settingsPatch ?? {};
    settingsPatch.brandColor = body.brandColor.trim() || null;
  }

  const contactFields: Record<string, string> = {};
  if (typeof body.contactName === 'string') {
    contactFields.contactName = body.contactName;
  }
  if (typeof body.contactRole === 'string') {
    contactFields.contactRole = body.contactRole;
  }
  if (typeof body.contactPhone === 'string') {
    contactFields.contactPhone = body.contactPhone;
  }
  if (typeof body.contactEmail === 'string') {
    contactFields.contactEmail = body.contactEmail;
  }
  if (Object.keys(contactFields).length > 0) {
    const contactErr = validateOrgContactSettingsFields(contactFields);
    if (contactErr) return jsonError(req, contactErr);
    settingsPatch = settingsPatch ?? {};
    if (typeof body.contactName === 'string') {
      settingsPatch.contactName = body.contactName.trim() || null;
    }
    if (typeof body.contactRole === 'string') {
      settingsPatch.contactRole = body.contactRole.trim() || null;
    }
    if (typeof body.contactPhone === 'string') {
      settingsPatch.contactPhone = body.contactPhone.trim() || null;
    }
    if (typeof body.contactEmail === 'string') {
      settingsPatch.contactEmail = body.contactEmail.trim() || null;
    }
  }

  if (Object.keys(patch).length === 0 && !settingsPatch) {
    return jsonError(req, 'No valid fields to update');
  }

  const supabase = createServiceClient();

  if (typeof patch.name === 'string') {
    try {
      const conflict = await findOrganizationNameConflict(supabase, patch.name as string, orgId);
      if (conflict) {
        return jsonError(req, DUPLICATE_ORGANIZATION_NAME_MESSAGE, 409);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Validation failed';
      return jsonError(req, msg, 500);
    }

    patch.slug = await allocateOrganizationSlug(supabase, patch.name as string, undefined, orgId);
  }

  if (settingsPatch) {
    const currentSettings =
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? (org.settings as Record<string, unknown>)
        : {};
    patch.settings = { ...currentSettings, ...settingsPatch };
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', orgId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const message =
        typeof patch.name === 'string'
          ? DUPLICATE_ORGANIZATION_NAME_MESSAGE
          : 'Slug is already taken';
      return jsonError(req, message, 409);
    }
    console.error('[update-organization]', error.message);
    return jsonError(req, 'Failed to update organization', 500);
  }

  if (settingsPatch?.brandColor !== undefined) {
    invalidateOrgBrandColorCache();
    invalidateAppSettingsCache();
  }

  return jsonSuccess(req, { organization: serializeOrganization(data) });
});
