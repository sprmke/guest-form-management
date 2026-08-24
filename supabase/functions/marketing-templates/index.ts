/**
 * marketing-templates — Admin CRUD for property-scoped marketing design templates.
 * Auth: serveAdmin + resolveAdminPropertyId.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { catchPlanFeatureError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import {
  resolveAdminPropertyId,
  resolveOrganizationIdForProperty,
} from '../_shared/propertyScope.ts';
import { serveAdmin } from '../_shared/serveEdge.ts';

const CONTENT_TYPES = new Set(['calendar', 'design', 'video']);

type MarketingTemplateRow = {
  id: string;
  property_id: string;
  organization_id: string;
  name: string;
  content_type: string;
  platform: string | null;
  aspect_preset: string | null;
  design_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function serializeTemplate(row: MarketingTemplateRow) {
  return {
    id: row.id,
    propertyId: row.property_id,
    organizationId: row.organization_id,
    name: row.name,
    contentType: row.content_type,
    platform: row.platform,
    aspectPreset: row.aspect_preset,
    designJson: row.design_json ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDesignJson(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

serveAdmin('marketing-templates', async (req, admin) => {
  const propertyId = await resolveAdminPropertyId(req, admin.id);
  const organizationId = await resolveOrganizationIdForProperty(propertyId);
  const sb = createServiceClient();
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const templateId = url.searchParams.get('id')?.trim();
    let query = sb
      .from('marketing_templates')
      .select('*')
      .eq('property_id', propertyId)
      .order('updated_at', { ascending: false });

    if (templateId) {
      query = query.eq('id', templateId);
    }

    const { data, error } = templateId ? await query.maybeSingle() : await query;
    if (error) return jsonError(req, error.message, 500);

    if (templateId) {
      if (!data) return jsonError(req, 'Template not found', 404);
      return jsonSuccess(req, serializeTemplate(data as MarketingTemplateRow));
    }

    const rows = (data ?? []) as MarketingTemplateRow[];
    return jsonSuccess(req, { templates: rows.map(serializeTemplate) });
  }

  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      await requirePropertyFeature(propertyId, 'customTemplates');
    } catch (err) {
      const planErr = catchPlanFeatureError(req, err);
      if (planErr) return planErr;
      throw err;
    }
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim() || null : null;
    const aspectPreset =
      typeof body.aspectPreset === 'string' ? body.aspectPreset.trim() || null : null;
    const designJson = parseDesignJson(body.designJson);

    if (!name) return jsonError(req, 'name is required', 400);
    if (!CONTENT_TYPES.has(contentType)) {
      return jsonError(req, 'contentType must be calendar, design, or video', 400);
    }
    if (designJson === null) return jsonError(req, 'designJson must be an object', 400);

    const { data, error } = await sb
      .from('marketing_templates')
      .insert({
        property_id: propertyId,
        organization_id: organizationId,
        name,
        content_type: contentType,
        platform,
        aspect_preset: aspectPreset,
        design_json: designJson,
        created_by: admin.id,
      })
      .select('*')
      .single();

    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, serializeTemplate(data as MarketingTemplateRow));
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const templateId = typeof body.id === 'string' ? body.id.trim() : '';
    if (!templateId) return jsonError(req, 'id is required', 400);

    const patch: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return jsonError(req, 'name cannot be empty', 400);
      patch.name = name;
    }
    if (typeof body.contentType === 'string') {
      const contentType = body.contentType.trim();
      if (!CONTENT_TYPES.has(contentType)) {
        return jsonError(req, 'contentType must be calendar, design, or video', 400);
      }
      patch.content_type = contentType;
    }
    if (body.platform !== undefined) {
      patch.platform =
        typeof body.platform === 'string' && body.platform.trim() ? body.platform.trim() : null;
    }
    if (body.aspectPreset !== undefined) {
      patch.aspect_preset =
        typeof body.aspectPreset === 'string' && body.aspectPreset.trim()
          ? body.aspectPreset.trim()
          : null;
    }
    if (body.designJson !== undefined) {
      const designJson = parseDesignJson(body.designJson);
      if (designJson === null) return jsonError(req, 'designJson must be an object', 400);
      patch.design_json = designJson;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(req, 'No valid fields to update', 400);
    }

    const { data, error } = await sb
      .from('marketing_templates')
      .update(patch)
      .eq('id', templateId)
      .eq('property_id', propertyId)
      .select('*')
      .maybeSingle();

    if (error) return jsonError(req, error.message, 500);
    if (!data) return jsonError(req, 'Template not found', 404);
    return jsonSuccess(req, serializeTemplate(data as MarketingTemplateRow));
  }

  if (req.method === 'DELETE') {
    const body = await readJsonBody(req);
    const templateId =
      (typeof body.id === 'string' ? body.id.trim() : '') ||
      url.searchParams.get('id')?.trim() ||
      '';
    if (!templateId) return jsonError(req, 'id is required', 400);

    const { data, error } = await sb
      .from('marketing_templates')
      .delete()
      .eq('id', templateId)
      .eq('property_id', propertyId)
      .select('id')
      .maybeSingle();

    if (error) return jsonError(req, error.message, 500);
    if (!data) return jsonError(req, 'Template not found', 404);
    return jsonSuccess(req, { deleted: true, id: templateId });
  }

  return jsonError(req, 'Method not allowed', 405);
});
