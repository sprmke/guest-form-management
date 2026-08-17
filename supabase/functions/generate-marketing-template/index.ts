/**
 * generate-marketing-template — AI design tokens for Marketing Content Studio.
 * Calendar MVP: returns schema-constrained tokens; UI compiles into CalendarStyles.
 */

import { generateMarketingTemplateTokens } from '../_shared/marketingTemplateGenerationAi.ts';
import { jsonError, jsonResponse, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { isAiPlatformDisabledError, isAiQuotaError } from '../_shared/aiUsageService.ts';
import { resolveAdminPropertyId } from '../_shared/propertyScope.ts';
import { serveAdmin } from '../_shared/serveEdge.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';

serveAdmin('generate-marketing-template', async (req, admin) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const propertyId = await resolveAdminPropertyId(req, admin.id);
  const body = await readJsonBody(req);

  const contentType =
    body.contentType === 'design' || body.contentType === 'video' || body.contentType === 'calendar'
      ? body.contentType
      : 'calendar';

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return jsonError(req, 'Prompt is required', 400);
  }
  if (prompt.length > 500) {
    return jsonError(req, 'Prompt is too long', 400);
  }
  const includeContext =
    body.includeContext && typeof body.includeContext === 'object'
      ? (body.includeContext as Record<string, unknown>)
      : {};

  const includeAmenities = includeContext.amenities !== false;
  const includeAvailability = includeContext.availability !== false;
  const includePropertyPhoto = includeContext.propertyPhoto !== false;

  const amenitiesText =
    includeAmenities && typeof body.amenitiesText === 'string'
      ? body.amenitiesText.trim()
      : undefined;
  const availabilityText =
    includeAvailability && typeof body.availabilityText === 'string'
      ? body.availabilityText.trim()
      : undefined;

  const preferencesRaw =
    body.preferences && typeof body.preferences === 'object'
      ? (body.preferences as Record<string, unknown>)
      : {};
  const preferences = {
    layoutArchetype:
      typeof preferencesRaw.layoutArchetype === 'string' &&
      preferencesRaw.layoutArchetype !== 'auto'
        ? preferencesRaw.layoutArchetype.trim()
        : undefined,
    fontPairing:
      typeof preferencesRaw.fontPairing === 'string' && preferencesRaw.fontPairing !== 'auto'
        ? preferencesRaw.fontPairing.trim()
        : undefined,
    backgroundMood:
      typeof preferencesRaw.backgroundMood === 'string' && preferencesRaw.backgroundMood !== 'auto'
        ? preferencesRaw.backgroundMood.trim()
        : undefined,
    category:
      typeof preferencesRaw.category === 'string' && preferencesRaw.category !== 'auto'
        ? preferencesRaw.category.trim()
        : undefined,
  };

  const content = typeof body.content === 'string' ? body.content.trim() : undefined;
  const includeOrgLogo = includeContext.orgLogo !== false;
  const includePropertyName = includeContext.propertyName !== false;
  const includeCta = includeContext.cta !== false;

  const sb = createServiceClient();
  const { data: propertyRow, error } = await sb
    .from('properties')
    .select('name, residence_name, address, settings, organization_id')
    .eq('id', propertyId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!propertyRow?.name || !propertyRow.organization_id) {
    return jsonError(req, 'Property not found', 404);
  }

  const settings = (propertyRow.settings ?? {}) as Record<string, unknown>;
  const media = Array.isArray(settings.media) ? settings.media : [];
  const hasPropertyPhoto =
    includePropertyPhoto &&
    media.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const type = typeof row.type === 'string' ? row.type : 'image';
      return Boolean(url) && type !== 'video';
    });

  const settingsAmenities = Array.isArray(settings.amenities)
    ? settings.amenities.filter((item): item is string => typeof item === 'string').slice(0, 8)
    : [];
  const resolvedAmenities =
    amenitiesText ||
    (includeAmenities && settingsAmenities.length > 0 ? settingsAmenities.join(', ') : undefined);

  const propertyLabel = [propertyRow.name, propertyRow.residence_name, propertyRow.address]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' · ');

  try {
    const result = await generateMarketingTemplateTokens({
      organizationId: String(propertyRow.organization_id),
      propertyId,
      contentType,
      prompt,
      propertyName: propertyLabel || String(propertyRow.name),
      amenitiesText: resolvedAmenities,
      availabilityText,
      hasPropertyPhoto,
      preferences,
      content,
      includeOrgLogo,
      includePropertyName,
      includeCta,
      actorUserId: admin.id,
      actorType: 'staff',
    });

    return jsonSuccess(req, result);
  } catch (err) {
    if (isAiQuotaError(err)) {
      return jsonResponse(
        req,
        { success: false, error: (err as Error).message, upgradeHook: true },
        429
      );
    }
    if (isAiPlatformDisabledError(err)) {
      return jsonError(req, (err as Error).message, 503);
    }
    return jsonError(req, (err as Error).message, 503);
  }
});
