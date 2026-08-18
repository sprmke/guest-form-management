/**
 * property-plan — GET subscription tiers + current property plan; POST assign Free tier only (owner).
 */

import { createServiceClient, verifyPropertyOwner } from '../_shared/orgAuth.ts';
import {
  assignPropertyToPlan,
  getActivePropertySubscription,
} from '../_shared/planEntitlements.ts';
import { parsePlanFeatures } from '../_shared/planFeatures.ts';
import { normalizePlanDiscountPercent } from '../_shared/planPricing.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { readPropertyIdFromUrl, resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function serializeTransaction(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'PHP'),
    status: String(row.status ?? ''),
    checkoutUrl: (row.checkout_url as string | null) ?? null,
    paymentMethodType: (row.payment_method_type as string | null) ?? null,
    createdAt: row.created_at as string,
    paidAt: (row.paid_at as string | null) ?? null,
  };
}

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

function serializeSubscription(sub: Awaited<ReturnType<typeof loadBillingSubscription>>) {
  if (!sub) return null;
  return {
    id: sub.id,
    planId: sub.planId,
    planCode: sub.planCode,
    planName: sub.planName,
    pricingModel: sub.pricingModel,
    status: sub.status,
    pricePhpSnapshot: sub.pricePhpSnapshot,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    gracePeriodEndsAt: sub.gracePeriodEndsAt ?? null,
  };
}

async function loadBillingSubscription(propertyId: string) {
  const supabase = createServiceClient();
  const active = await getActivePropertySubscription(propertyId);
  if (active) {
    const { data: graceRow } = await supabase
      .from('property_subscriptions')
      .select('grace_period_ends_at')
      .eq('id', active.id)
      .maybeSingle();
    return {
      ...active,
      gracePeriodEndsAt: (graceRow?.grace_period_ends_at as string | null) ?? null,
    };
  }

  const { data: suspended, error } = await supabase
    .from('property_subscriptions')
    .select(
      `
      id,
      property_id,
      organization_id,
      plan_id,
      pricing_model,
      price_php_snapshot,
      commission_rate_percent_snapshot,
      status,
      current_period_start,
      current_period_end,
      grace_period_ends_at,
      feature_overrides,
      pricing_plans!inner (
        id,
        code,
        name,
        pricing_model,
        price_php,
        commission_rate_percent,
        features,
        is_default
      )
    `
    )
    .eq('property_id', propertyId)
    .eq('status', 'suspended')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!suspended) return null;

  const plan = (suspended as Record<string, unknown>).pricing_plans as Record<string, unknown>;
  return {
    id: suspended.id as string,
    propertyId: suspended.property_id as string,
    organizationId: suspended.organization_id as string,
    planId: suspended.plan_id as string,
    pricingModel: suspended.pricing_model as string,
    pricePhpSnapshot:
      suspended.price_php_snapshot == null ? null : Number(suspended.price_php_snapshot),
    commissionRatePercentSnapshot:
      suspended.commission_rate_percent_snapshot == null
        ? null
        : Number(suspended.commission_rate_percent_snapshot),
    status: String(suspended.status),
    currentPeriodStart: (suspended.current_period_start as string | null) ?? null,
    currentPeriodEnd: (suspended.current_period_end as string | null) ?? null,
    gracePeriodEndsAt: (suspended.grace_period_ends_at as string | null) ?? null,
    featureOverrides: null,
    planCode: String(plan.code ?? ''),
    planName: String(plan.name ?? ''),
    planFeatures: parsePlanFeatures(plan.features),
  };
}

serveAuthenticated('property-plan', async (req, user) => {
  const url = new URL(req.url);
  const propertyIdFromQuery = readPropertyIdFromUrl(url);

  if (req.method === 'GET') {
    const { property } = await resolveScopedPropertyAccess(
      req,
      'settings:view',
      propertyIdFromQuery
    );
    const propertyId = property.id as string;

    const supabase = createServiceClient();
    const { data: plans, error: plansError } = await supabase
      .from('pricing_plans')
      .select(
        'id, code, name, tagline, sort_order, pricing_model, price_php, discount_percent, features, is_default'
      )
      .eq('pricing_model', 'subscription')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansError) return jsonError(req, plansError.message, 500);

    const subscription = await loadBillingSubscription(propertyId);

    const { data: transactions } = await supabase
      .from('property_payment_transactions')
      .select(
        'id, amount, currency, status, checkout_url, payment_method_type, created_at, paid_at'
      )
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: pendingCheckout } = await supabase
      .from('property_payment_transactions')
      .select('checkout_url')
      .eq('property_id', propertyId)
      .eq('status', 'pending')
      .not('checkout_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return jsonSuccess(req, {
      plans: (plans ?? []).map((row) => serializePlan(row as Record<string, unknown>)),
      subscription: serializeSubscription(subscription),
      transactions: (transactions ?? []).map((row) =>
        serializeTransaction(row as Record<string, unknown>)
      ),
      pendingCheckoutUrl: (pendingCheckout?.checkout_url as string | null) ?? null,
    });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const body = await readJsonBody(req);
    const propertyId =
      (typeof body.propertyId === 'string' ? body.propertyId.trim() : '') ||
      (typeof body.property_id === 'string' ? body.property_id.trim() : '') ||
      propertyIdFromQuery;
    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';

    if (!propertyId || !planId) {
      return jsonError(req, 'propertyId and planId are required');
    }

    await verifyPropertyOwner(req, propertyId);

    const supabase = createServiceClient();
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('id, is_default, pricing_model, is_active')
      .eq('id', planId)
      .maybeSingle();

    if (planError) return jsonError(req, planError.message, 500);
    if (!plan || !plan.is_active) return jsonError(req, 'Plan not found', 404);
    if (plan.pricing_model !== 'subscription') {
      return jsonError(req, 'Only subscription plans can be selected on this page', 400);
    }
    if (!plan.is_default) {
      return jsonError(req, 'Paid plans require checkout — use create-subscription-checkout', 400);
    }

    await assignPropertyToPlan(propertyId, planId, user.id, {
      note: 'Host selected Free plan from property Plans page',
    });

    const subscription = await loadBillingSubscription(propertyId);

    return jsonSuccess(req, {
      subscription: serializeSubscription(subscription),
    });
  }

  return jsonError(req, 'Method not allowed', 405);
});
