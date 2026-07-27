/**
 * generate-marketing-caption — AI caption suggestions for Content Studio.
 */

import { generateMarketingCaption } from '../_shared/marketingCaptionAi.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { resolveAdminPropertyId } from '../_shared/propertyScope.ts';
import { serveAdmin } from '../_shared/serveEdge.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';

serveAdmin('generate-marketing-caption', async (req, admin) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const propertyId = await resolveAdminPropertyId(req, admin.id);
  const body = await readJsonBody(req);

  const platform = body.platform === 'instagram' ? 'instagram' : 'facebook';
  const postType = body.postType === 'story' ? 'story' : 'post';
  const contentHint = typeof body.contentHint === 'string' ? body.contentHint.trim() : '';
  const nightlyRate = typeof body.nightlyRate === 'string' ? body.nightlyRate.trim() : '';
  const availabilityText =
    typeof body.availabilityText === 'string' ? body.availabilityText.trim() : '';

  const sb = createServiceClient();
  const { data: propertyRow, error } = await sb
    .from('properties')
    .select('name')
    .eq('id', propertyId)
    .maybeSingle();

  if (error) return jsonError(req, error.message, 500);
  if (!propertyRow?.name) return jsonError(req, 'Property not found', 404);

  try {
    const caption = await generateMarketingCaption({
      propertyName: String(propertyRow.name),
      platform,
      postType,
      contentHint: contentHint || undefined,
      nightlyRate: nightlyRate || undefined,
      availabilityText: availabilityText || undefined,
    });

    return jsonSuccess(req, { caption });
  } catch (err) {
    return jsonError(req, (err as Error).message, 503);
  }
});
