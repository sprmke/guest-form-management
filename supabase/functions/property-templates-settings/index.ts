/**
 * property-templates-settings — Admin GET/PATCH for property template content.
 * Auth: verifyAdminJwt
 */

import {
  countCustomTemplates,
  deletePropertyTemplateRow,
  getBuiltinPropertyTemplate,
  isBuiltinPropertyTemplateKey,
  isCustomTemplateKey,
  MAX_CUSTOM_TEMPLATES,
  serializePropertyTemplatesForAdmin,
  upsertPropertyTemplateRow,
  validateCustomTemplateName,
  validateTemplateContent,
} from '../_shared/propertyTemplates.ts';
import { jsonError, jsonSuccess, readJsonBody } from '../_shared/httpResponse.ts';
import { catchPlanFeatureError, requirePropertyFeature } from '../_shared/planEntitlements.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('property-templates-settings', async (req) => {
  const permission = req.method === 'GET' ? 'templates:view' : 'templates:edit';
  const { property } = await resolveScopedPropertyAccess(req, permission);
  const propertyId = property.id;

  if (req.method === 'GET') {
    const data = await serializePropertyTemplatesForAdmin(propertyId);
    return jsonSuccess(req, data);
  }

  if (req.method === 'PATCH') {
    const body = await readJsonBody(req);

    if (body.action === 'delete') {
      const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';
      if (!isCustomTemplateKey(templateKey)) {
        return jsonError(req, 'Only custom templates can be deleted', 400);
      }
      await deletePropertyTemplateRow(propertyId, templateKey);
      const data = await serializePropertyTemplatesForAdmin(propertyId);
      return jsonSuccess(req, data);
    }

    if (body.action === 'reset') {
      const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';
      if (!isBuiltinPropertyTemplateKey(templateKey)) {
        return jsonError(req, 'Only built-in templates can be reset', 400);
      }
      const builtin = getBuiltinPropertyTemplate(templateKey)!;
      await upsertPropertyTemplateRow({
        propertyId,
        templateKey,
        category: builtin.category,
        content: builtin.defaultContent,
        ...(builtin.category === 'standard' ? { sectionImageUrl: null } : {}),
      });
      const data = await serializePropertyTemplatesForAdmin(propertyId);
      return jsonSuccess(req, data);
    }

    if (body.action === 'create') {
      try {
        await requirePropertyFeature(propertyId, 'customTemplates');
      } catch (err) {
        const planErr = catchPlanFeatureError(req, err);
        if (planErr) return planErr;
        throw err;
      }

      const name = typeof body.name === 'string' ? body.name : '';
      const content = typeof body.content === 'string' ? body.content : '';
      const nameErr = validateCustomTemplateName(name);
      if (nameErr) return jsonError(req, nameErr, 400);
      const contentErr = validateTemplateContent(content);
      if (contentErr) return jsonError(req, contentErr, 400);

      const customCount = await countCustomTemplates(propertyId);
      if (customCount >= MAX_CUSTOM_TEMPLATES) {
        return jsonError(req, `Maximum ${MAX_CUSTOM_TEMPLATES} custom templates allowed`, 400);
      }

      const templateKey = `custom-${crypto.randomUUID()}`;
      await upsertPropertyTemplateRow({
        propertyId,
        templateKey,
        category: 'custom',
        name: name.trim(),
        content,
      });
      const data = await serializePropertyTemplatesForAdmin(propertyId);
      return jsonSuccess(req, data);
    }

    const templateKey = typeof body.templateKey === 'string' ? body.templateKey.trim() : '';
    const content = typeof body.content === 'string' ? body.content : null;
    const sectionImageUrl =
      body.sectionImageUrl === null || typeof body.sectionImageUrl === 'string'
        ? (body.sectionImageUrl as string | null)
        : undefined;

    if (!templateKey) {
      return jsonError(req, 'templateKey is required', 400);
    }
    if (content === null) {
      return jsonError(req, 'content is required', 400);
    }

    const contentErr = validateTemplateContent(content);
    if (contentErr) return jsonError(req, contentErr, 400);

    if (isCustomTemplateKey(templateKey)) {
      try {
        await requirePropertyFeature(propertyId, 'customTemplates');
      } catch (err) {
        const planErr = catchPlanFeatureError(req, err);
        if (planErr) return planErr;
        throw err;
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name) {
        const nameErr = validateCustomTemplateName(name);
        if (nameErr) return jsonError(req, nameErr, 400);
      }
      await upsertPropertyTemplateRow({
        propertyId,
        templateKey,
        category: 'custom',
        name: name || undefined,
        content,
      });
    } else if (isBuiltinPropertyTemplateKey(templateKey)) {
      const builtin = getBuiltinPropertyTemplate(templateKey)!;
      if (builtin.category === 'email') {
        try {
          await requirePropertyFeature(propertyId, 'customTemplates');
        } catch (err) {
          const planErr = catchPlanFeatureError(req, err);
          if (planErr) return planErr;
          throw err;
        }
      }
      await upsertPropertyTemplateRow({
        propertyId,
        templateKey,
        category: builtin.category,
        content,
        ...(builtin.category === 'standard' && sectionImageUrl !== undefined
          ? { sectionImageUrl }
          : {}),
      });
    } else {
      return jsonError(req, 'Unknown template key', 400);
    }

    const data = await serializePropertyTemplatesForAdmin(propertyId);
    return jsonSuccess(req, data);
  }

  return jsonError(req, 'Method not allowed', 405);
});
