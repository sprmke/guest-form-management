/**
 * pricing-plans — Super-admin CRUD for the host tier catalog (pricing_plans).
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { parsePlanFeatures, type PlanFeatures } from '../_shared/planFeatures.ts';
import { normalizePlanDiscountPercent } from '../_shared/planPricing.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

function serializePlan(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    tagline: (row.tagline as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    pricingModel: row.pricing_model as string,
    pricePhp: row.price_php == null ? null : Number(row.price_php),
    discountPercent: normalizePlanDiscountPercent(
      row.discount_percent == null ? 0 : Number(row.discount_percent)
    ),
    billingInterval: row.billing_interval as string,
    commissionRatePercent:
      row.commission_rate_percent == null ? null : Number(row.commission_rate_percent),
    features: parsePlanFeatures(row.features),
    isActive: Boolean(row.is_active),
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function parseFeaturesInput(raw: unknown): PlanFeatures | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return parsePlanFeatures(raw);
}

serveSuperAdmin('pricing-plans', async (req) => {
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const planId = url.searchParams.get('planId')?.trim() || null;

  if (req.method === 'GET') {
    if (planId) {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (error) return jsonError(req, error.message, 500);
      if (!data) return jsonError(req, 'Plan not found', 404);
      return jsonSuccess(req, { plan: serializePlan(data as Record<string, unknown>) });
    }

    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, {
      plans: (data ?? []).map((row) => serializePlan(row as Record<string, unknown>)),
    });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const body = await readJsonBody(req);

    const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!code || !name) return jsonError(req, 'code and name are required');

    const features = parseFeaturesInput(body.features);
    if (!features) return jsonError(req, 'features object is required');

    const pricingModel = body.pricingModel === 'commission' ? 'commission' : 'subscription';
    const isDefault = body.isDefault === true;

    if (isDefault) {
      await supabase.from('pricing_plans').update({ is_default: false }).eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('pricing_plans')
      .insert({
        code,
        name,
        tagline: typeof body.tagline === 'string' ? body.tagline.trim() || null : null,
        sort_order: typeof body.sortOrder === 'number' ? Math.round(body.sortOrder) : 0,
        pricing_model: pricingModel,
        price_php: typeof body.pricePhp === 'number' ? body.pricePhp : null,
        discount_percent:
          typeof body.discountPercent === 'number'
            ? normalizePlanDiscountPercent(body.discountPercent)
            : 0,
        billing_interval: 'month',
        commission_rate_percent:
          typeof body.commissionRatePercent === 'number' ? body.commissionRatePercent : null,
        features,
        is_active: body.isActive !== false,
        is_default: isDefault,
      })
      .select('*')
      .single();

    if (error) return jsonError(req, error.message, 500);
    return jsonSuccess(req, { plan: serializePlan(data as Record<string, unknown>) });
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const body = await readJsonBody(req);
    const id = typeof body.planId === 'string' ? body.planId.trim() : planId;
    if (!id) return jsonError(req, 'planId is required');

    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string') patch.name = body.name.trim();
    if (typeof body.tagline === 'string') patch.tagline = body.tagline.trim() || null;
    if (typeof body.sortOrder === 'number') patch.sort_order = Math.round(body.sortOrder);
    if (body.pricingModel === 'commission' || body.pricingModel === 'subscription') {
      patch.pricing_model = body.pricingModel;
    }
    if (body.pricePhp === null) patch.price_php = null;
    else if (typeof body.pricePhp === 'number') patch.price_php = body.pricePhp;
    if (typeof body.discountPercent === 'number') {
      patch.discount_percent = normalizePlanDiscountPercent(body.discountPercent);
    }
    if (body.commissionRatePercent === null) patch.commission_rate_percent = null;
    else if (typeof body.commissionRatePercent === 'number') {
      patch.commission_rate_percent = body.commissionRatePercent;
    }
    const features = parseFeaturesInput(body.features);
    if (features) patch.features = features;
    if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;
    if (body.isDefault === true) {
      await supabase.from('pricing_plans').update({ is_default: false }).eq('is_default', true);
      patch.is_default = true;
    } else if (body.isDefault === false) {
      patch.is_default = false;
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(req, 'No fields to update');
    }

    const { data, error } = await supabase
      .from('pricing_plans')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return jsonError(req, error.message, 500);
    if (!data) return jsonError(req, 'Plan not found', 404);
    return jsonSuccess(req, { plan: serializePlan(data as Record<string, unknown>) });
  }

  return jsonError(req, 'Method not allowed', 405);
});
