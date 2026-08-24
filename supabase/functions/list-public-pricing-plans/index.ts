/**
 * list-public-pricing-plans — Public GET for `/for-hosts/pricing`.
 * Same subscription ladder as property Plans (`property-plan` GET). Excludes
 * commission (not host-selectable yet) and org-bundle-only `business_plus`.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { parsePlanFeatures } from '../_shared/planFeatures.ts';
import { normalizePlanDiscountPercent } from '../_shared/planPricing.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';

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
    features: parsePlanFeatures(row.features),
    isDefault: Boolean(row.is_default),
  };
}

servePublic('list-public-pricing-plans', async (req) => {
  requireHttpMethod(req, 'GET');
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('pricing_plans')
    .select(
      'id, code, name, tagline, sort_order, pricing_model, price_php, discount_percent, features, is_default'
    )
    .eq('pricing_model', 'subscription')
    .eq('is_active', true)
    .neq('code', 'business_plus')
    .order('sort_order', { ascending: true });

  if (error) return jsonError(req, error.message, 500);

  return jsonSuccess(req, {
    plans: (data ?? []).map((row) => serializePlan(row as Record<string, unknown>)),
  });
});
