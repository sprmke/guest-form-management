/**
 * org-plan — GET org portfolio subscription state + bundle-eligible plans + org properties.
 * Parallel to property-plan (per-property). See docs/workflow/planned/pricing-portfolio-bundling.md.
 */

import { createServiceClient, verifyOrgAccess } from '../_shared/orgAuth.ts';
import { parsePlanFeatures } from '../_shared/planFeatures.ts';
import { normalizePlanDiscountPercent } from '../_shared/planPricing.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

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
    maxProperties: row.max_properties == null ? null : Number(row.max_properties),
    features: parsePlanFeatures(row.features),
    isDefault: Boolean(row.is_default),
  };
}

serveAuthenticated('org-plan', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId')?.trim() || undefined;
  const orgSlug = url.searchParams.get('orgSlug')?.trim() || undefined;
  if (!orgId && !orgSlug) {
    return jsonError(req, 'orgId or orgSlug is required');
  }

  const { org } = await verifyOrgAccess(req, { orgId, orgSlug });
  const organizationId = org.id as string;

  const supabase = createServiceClient();

  const { data: plans, error: plansError } = await supabase
    .from('pricing_plans')
    .select(
      'id, code, name, tagline, sort_order, pricing_model, price_php, discount_percent, features, is_default, max_properties'
    )
    .eq('pricing_model', 'subscription')
    .eq('is_active', true)
    .not('max_properties', 'is', null)
    .order('sort_order', { ascending: true });
  if (plansError) return jsonError(req, plansError.message, 500);

  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, name, slug, status')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  if (propertiesError) return jsonError(req, propertiesError.message, 500);

  const { data: orgSubRow, error: orgSubError } = await supabase
    .from('org_subscriptions')
    .select(
      `
      id,
      plan_id,
      pricing_model,
      price_php_snapshot,
      max_properties_snapshot,
      status,
      current_period_start,
      current_period_end,
      pricing_plans!inner ( id, code, name )
    `
    )
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (orgSubError) return jsonError(req, orgSubError.message, 500);

  let subscription: Record<string, unknown> | null = null;
  let assignedPropertyIds: string[] = [];

  if (orgSubRow) {
    const planJoin = (orgSubRow as Record<string, unknown>).pricing_plans as Record<
      string,
      unknown
    >;
    subscription = {
      id: orgSubRow.id as string,
      planId: orgSubRow.plan_id as string,
      planCode: String(planJoin.code ?? ''),
      planName: String(planJoin.name ?? ''),
      pricingModel: orgSubRow.pricing_model as string,
      status: orgSubRow.status as string,
      pricePhpSnapshot:
        orgSubRow.price_php_snapshot == null ? null : Number(orgSubRow.price_php_snapshot),
      maxProperties: Number(orgSubRow.max_properties_snapshot ?? 0),
      currentPeriodStart: (orgSubRow.current_period_start as string | null) ?? null,
      currentPeriodEnd: (orgSubRow.current_period_end as string | null) ?? null,
    };

    const { data: slots, error: slotsError } = await supabase
      .from('org_subscription_properties')
      .select('property_id')
      .eq('org_subscription_id', orgSubRow.id as string);
    if (slotsError) return jsonError(req, slotsError.message, 500);
    assignedPropertyIds = (slots ?? []).map((row) => row.property_id as string);
  }

  const { data: pendingCheckout } = await supabase
    .from('org_payment_transactions')
    .select('checkout_url')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .not('checkout_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return jsonSuccess(req, {
    plans: (plans ?? []).map((row) => serializePlan(row as Record<string, unknown>)),
    properties: (properties ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      status: row.status as string,
    })),
    subscription,
    assignedPropertyIds,
    pendingCheckoutUrl: (pendingCheckout?.checkout_url as string | null) ?? null,
  });
});
