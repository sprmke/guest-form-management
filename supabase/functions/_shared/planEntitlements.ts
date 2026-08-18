/**
 * Per-property plan assignment and entitlement resolution.
 * Single source of truth — do not duplicate merge logic at call sites.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { computeBookingFinancials } from './bookingFinance.ts';
import {
  isFeatureEnabled,
  mergePlanFeatures,
  parsePlanFeatures,
  type PlanFeatureKey,
  type PlanFeatures,
} from './planFeatures.ts';
import { jsonUpgradeHook } from './httpResponse.ts';
import type { TelegramAssetScope } from './telegramAssetScope.ts';
import { upsertAiPlatformOrgSettings } from './aiUsageService.ts';
import { discountedPlanPricePhp } from './planPricing.ts';

export class PlanFeatureRequiredError extends Error {
  readonly upgradeHook = true;

  constructor(
    readonly feature: PlanFeatureKey,
    message?: string
  ) {
    super(message ?? `This feature requires a paid plan (${feature})`);
    this.name = 'PlanFeatureRequiredError';
  }
}

export type PricingModel = 'subscription' | 'commission';

export type PropertySubscriptionRow = {
  id: string;
  propertyId: string;
  organizationId: string;
  planId: string;
  pricingModel: PricingModel;
  pricePhpSnapshot: number | null;
  commissionRatePercentSnapshot: number | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  featureOverrides: Record<string, unknown> | null;
  planCode: string;
  planName: string;
  planFeatures: PlanFeatures;
};

export type ResolvedPropertyEntitlements = PlanFeatures & {
  planCode: string;
  planName: string;
  pricingModel: PricingModel;
  status: string;
  propertySubscriptionId: string;
  planId: string;
};

type PricingPlanRow = {
  id: string;
  code: string;
  name: string;
  pricing_model: string;
  price_php: number | null;
  discount_percent: number | null;
  commission_rate_percent: number | null;
  features: unknown;
  is_default: boolean;
};

function db() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

function serializeSubscription(
  sub: Record<string, unknown>,
  plan: PricingPlanRow
): PropertySubscriptionRow {
  return {
    id: sub.id as string,
    propertyId: sub.property_id as string,
    organizationId: sub.organization_id as string,
    planId: sub.plan_id as string,
    pricingModel: sub.pricing_model as PricingModel,
    pricePhpSnapshot: sub.price_php_snapshot == null ? null : Number(sub.price_php_snapshot),
    commissionRatePercentSnapshot:
      sub.commission_rate_percent_snapshot == null
        ? null
        : Number(sub.commission_rate_percent_snapshot),
    status: String(sub.status ?? 'active'),
    currentPeriodStart: (sub.current_period_start as string | null) ?? null,
    currentPeriodEnd: (sub.current_period_end as string | null) ?? null,
    featureOverrides:
      sub.feature_overrides && typeof sub.feature_overrides === 'object'
        ? (sub.feature_overrides as Record<string, unknown>)
        : null,
    planCode: plan.code,
    planName: plan.name,
    planFeatures: parsePlanFeatures(plan.features),
  };
}

export async function getDefaultPricingPlan(): Promise<PricingPlanRow> {
  const sb = db();
  const { data, error } = await sb
    .from('pricing_plans')
    .select(
      'id, code, name, pricing_model, price_php, discount_percent, commission_rate_percent, features, is_default'
    )
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: fallback, error: fbError } = await sb
      .from('pricing_plans')
      .select(
        'id, code, name, pricing_model, price_php, discount_percent, commission_rate_percent, features, is_default'
      )
      .eq('code', 'free')
      .maybeSingle();
    if (fbError) throw new Error(fbError.message);
    if (!fallback) throw new Error('No default pricing plan configured');
    return fallback as PricingPlanRow;
  }
  return data as PricingPlanRow;
}

export async function getActivePropertySubscription(
  propertyId: string
): Promise<PropertySubscriptionRow | null> {
  const sb = db();
  const { data, error } = await sb
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
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const plan = (data as Record<string, unknown>).pricing_plans as PricingPlanRow;
  const { pricing_plans: _planJoin, ...sub } = data as Record<string, unknown>;
  return serializeSubscription(sub, plan);
}

export async function resolvePropertyEntitlements(
  propertyId: string
): Promise<ResolvedPropertyEntitlements> {
  let subscription = await getActivePropertySubscription(propertyId);

  if (!subscription) {
    const defaultPlan = await getDefaultPricingPlan();
    subscription = {
      id: '',
      propertyId,
      organizationId: '',
      planId: defaultPlan.id,
      pricingModel: defaultPlan.pricing_model as PricingModel,
      pricePhpSnapshot: defaultPlan.price_php == null ? null : Number(defaultPlan.price_php),
      commissionRatePercentSnapshot:
        defaultPlan.commission_rate_percent == null
          ? null
          : Number(defaultPlan.commission_rate_percent),
      status: 'active',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      featureOverrides: null,
      planCode: defaultPlan.code,
      planName: defaultPlan.name,
      planFeatures: parsePlanFeatures(defaultPlan.features),
    };
  }

  const merged = mergePlanFeatures(subscription.planFeatures, subscription.featureOverrides);

  return {
    ...merged,
    planCode: subscription.planCode,
    planName: subscription.planName,
    pricingModel: subscription.pricingModel,
    status: subscription.status,
    propertySubscriptionId: subscription.id,
    planId: subscription.planId,
  };
}

export async function requirePropertyFeature(
  propertyId: string,
  feature: PlanFeatureKey
): Promise<ResolvedPropertyEntitlements> {
  const entitlements = await resolvePropertyEntitlements(propertyId);
  if (!isFeatureEnabled(entitlements, feature)) {
    throw new PlanFeatureRequiredError(feature);
  }
  return entitlements;
}

/** Map PlanFeatureRequiredError to the shared upgradeHook JSON envelope. */
export function catchPlanFeatureError(req: Request, err: unknown): Response | null {
  if (err instanceof PlanFeatureRequiredError) {
    return jsonUpgradeHook(req, err.message, { feature: err.feature });
  }
  return null;
}

export async function countPropertyTeamSlots(propertyId: string): Promise<number> {
  const sb = db();
  const { count: memberCount, error: memberError } = await sb
    .from('property_members')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('status', 'active');
  if (memberError) throw new Error(memberError.message);

  const { count: inviteCount, error: inviteError } = await sb
    .from('property_team_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('status', 'pending');
  if (inviteError) throw new Error(inviteError.message);

  return (memberCount ?? 0) + (inviteCount ?? 0);
}

/** Blocks invite when team management is off or maxMembers is reached. */
export async function requireTeamInviteAllowed(
  propertyId: string
): Promise<ResolvedPropertyEntitlements> {
  const entitlements = await resolvePropertyEntitlements(propertyId);
  if (!entitlements.teamManagement.enabled) {
    throw new PlanFeatureRequiredError('teamManagement');
  }

  const max = entitlements.teamManagement.maxMembers;
  if (max !== null && max >= 0) {
    const count = await countPropertyTeamSlots(propertyId);
    if (count >= max) {
      throw new PlanFeatureRequiredError('teamManagement', `Team member limit reached (${max})`);
    }
  }

  return entitlements;
}

export async function requireTelegramNotificationsEnabled(propertyId: string): Promise<void> {
  await requirePropertyFeature(propertyId, 'telegramNotifications');
}

async function firstActivePropertyIdForOrg(orgId: string): Promise<string | null> {
  const sb = db();
  const { data, error } = await sb
    .from('properties')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

/** Property-scoped Telegram uses the property id; parking uses the org's first active property. */
export async function resolveTelegramEntitlementPropertyId(
  asset: TelegramAssetScope
): Promise<string> {
  if (asset.kind === 'property') return asset.id;

  const sb = db();
  const { data: parking, error } = await sb
    .from('parkings')
    .select('organization_id')
    .eq('id', asset.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!parking) throw new Error('Parking not found');

  const propertyId = await firstActivePropertyIdForOrg(parking.organization_id as string);
  if (!propertyId) {
    throw new PlanFeatureRequiredError(
      'telegramNotifications',
      'No active property found for plan check'
    );
  }
  return propertyId;
}

export async function orgHasPropertyWithFeature(
  orgId: string,
  feature: PlanFeatureKey
): Promise<boolean> {
  const sb = db();
  const { data: properties, error } = await sb
    .from('properties')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'ACTIVE');
  if (error) throw new Error(error.message);
  if (!properties?.length) return false;

  for (const row of properties) {
    const entitlements = await resolvePropertyEntitlements(row.id as string);
    if (isFeatureEnabled(entitlements, feature)) return true;
  }
  return false;
}

export async function requireOrgPropertyFeature(
  orgId: string,
  feature: PlanFeatureKey
): Promise<void> {
  const allowed = await orgHasPropertyWithFeature(orgId, feature);
  if (!allowed) {
    throw new PlanFeatureRequiredError(feature);
  }
}

export async function resolveListingEntitlementPropertyId(
  listingKind: 'property' | 'parking',
  listingId: string
): Promise<string> {
  if (listingKind === 'property') return listingId;

  const sb = db();
  const { data: parking, error } = await sb
    .from('parkings')
    .select('organization_id')
    .eq('id', listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!parking) throw new Error('Listing not found');

  const propertyId = await firstActivePropertyIdForOrg(parking.organization_id as string);
  if (!propertyId) {
    throw new PlanFeatureRequiredError(
      'recommendedBadgeEligible',
      'No active property found for plan check'
    );
  }
  return propertyId;
}

export function patchEnablesInboxAutoSend(
  body: Record<string, unknown>,
  current: { auto_reply_enabled?: boolean; auto_reply_mode?: string }
): boolean {
  const nextEnabled =
    body.autoReplyEnabled !== undefined
      ? Boolean(body.autoReplyEnabled)
      : Boolean(current.auto_reply_enabled);
  const nextMode =
    body.autoReplyMode === 'draft' || body.autoReplyMode === 'send'
      ? body.autoReplyMode
      : (current.auto_reply_mode ?? 'draft');
  const currentlyAutoSend =
    Boolean(current.auto_reply_enabled) && current.auto_reply_mode === 'send';
  const willAutoSend = nextEnabled && nextMode === 'send';
  return willAutoSend && !currentlyAutoSend;
}

async function syncAiCreditsFromPlan(
  organizationId: string,
  planCode: string,
  monthlyCreditAllowance: number,
  assignedBy: string
): Promise<void> {
  await upsertAiPlatformOrgSettings({
    organizationId,
    planTier: planCode,
    monthlyCreditLimit: monthlyCreditAllowance,
    updatedBy: assignedBy,
  });
}

async function writeSubscriptionEvent(input: {
  propertySubscriptionId: string;
  eventType: 'assigned' | 'plan_changed' | 'status_changed' | 'override_set';
  previousPlanId?: string | null;
  newPlanId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  const sb = db();
  const { error } = await sb.from('property_subscription_events').insert({
    property_subscription_id: input.propertySubscriptionId,
    event_type: input.eventType,
    previous_plan_id: input.previousPlanId ?? null,
    new_plan_id: input.newPlanId ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    note: input.note ?? null,
    created_by: input.createdBy ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function assignPropertyToPlan(
  propertyId: string,
  planId: string,
  assignedBy: string | null,
  options?: { featureOverrides?: Record<string, unknown> | null; note?: string | null }
): Promise<PropertySubscriptionRow> {
  const sb = db();

  const { data: property, error: propertyError } = await sb
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error('Property not found');

  const organizationId = property.organization_id as string;

  const { data: plan, error: planError } = await sb
    .from('pricing_plans')
    .select(
      'id, code, name, pricing_model, price_php, discount_percent, commission_rate_percent, features, is_default'
    )
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error('Pricing plan not found or inactive');

  const planRow = plan as PricingPlanRow;
  const features = parsePlanFeatures(planRow.features);

  const existing = await getActivePropertySubscription(propertyId);
  let existingRow = existing;

  if (!existingRow) {
    const { data: suspendedRow, error: suspendedError } = await sb
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
        feature_overrides,
        pricing_plans!inner (
          id,
          code,
          name,
          pricing_model,
          price_php,
          discount_percent,
          commission_rate_percent,
          features,
          is_default
        )
      `
      )
      .eq('property_id', propertyId)
      .eq('status', 'suspended')
      .maybeSingle();
    if (suspendedError) throw new Error(suspendedError.message);
    if (suspendedRow) {
      const planJoin = (suspendedRow as Record<string, unknown>).pricing_plans as PricingPlanRow;
      const { pricing_plans: _p, ...sub } = suspendedRow as Record<string, unknown>;
      existingRow = serializeSubscription(sub, planJoin);
    }
  }

  const checkoutPricePhp = discountedPlanPricePhp(planRow.price_php, planRow.discount_percent);

  const row = {
    property_id: propertyId,
    organization_id: organizationId,
    plan_id: planId,
    pricing_model: planRow.pricing_model,
    price_php_snapshot: checkoutPricePhp,
    commission_rate_percent_snapshot: planRow.commission_rate_percent,
    status: 'active' as const,
    feature_overrides: options?.featureOverrides ?? existingRow?.featureOverrides ?? null,
  };

  let subscriptionId: string;

  if (existingRow) {
    const { data: updated, error: updateError } = await sb
      .from('property_subscriptions')
      .update(row)
      .eq('id', existingRow.id)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);
    subscriptionId = updated.id as string;

    await writeSubscriptionEvent({
      propertySubscriptionId: subscriptionId,
      eventType: existingRow.planId === planId ? 'override_set' : 'plan_changed',
      previousPlanId: existingRow.planId,
      newPlanId: planId,
      previousStatus: existingRow.status,
      newStatus: 'active',
      note: options?.note ?? null,
      createdBy: assignedBy,
    });
  } else {
    const { data: inserted, error: insertError } = await sb
      .from('property_subscriptions')
      .insert(row)
      .select('*')
      .single();
    if (insertError) throw new Error(insertError.message);
    subscriptionId = inserted.id as string;

    await writeSubscriptionEvent({
      propertySubscriptionId: subscriptionId,
      eventType: 'assigned',
      newPlanId: planId,
      newStatus: 'active',
      note: options?.note ?? null,
      createdBy: assignedBy,
    });
  }

  await syncAiCreditsFromPlan(
    organizationId,
    planRow.code,
    features.aiMonthlyCreditAllowance,
    assignedBy ?? 'system'
  );

  const result = await getActivePropertySubscription(propertyId);
  if (!result) throw new Error('Failed to load property subscription after assign');
  return result;
}

export async function ensurePropertyDefaultPlan(
  propertyId: string,
  assignedBy: string
): Promise<PropertySubscriptionRow | null> {
  const existing = await getActivePropertySubscription(propertyId);
  if (existing) return existing;

  const defaultPlan = await getDefaultPricingPlan();
  return assignPropertyToPlan(propertyId, defaultPlan.id, assignedBy, {
    note: 'Auto-assigned default plan on property creation',
  });
}

export async function recordBookingCommissionChargeIfApplicable(
  booking: Record<string, unknown>,
  propertyId: string
): Promise<void> {
  const subscription = await getActivePropertySubscription(propertyId);
  if (!subscription || subscription.pricingModel !== 'commission') return;

  const rate = subscription.commissionRatePercentSnapshot;
  if (rate == null || rate <= 0) return;

  const bookingId = String(booking.id ?? '');
  if (!bookingId) return;

  const sb = db();
  const { data: existing } = await sb
    .from('booking_commission_charges')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existing) return;

  const financials = computeBookingFinancials(booking);
  const bookingRevenue = financials.hostNet;
  if (!Number.isFinite(bookingRevenue) || bookingRevenue <= 0) return;

  const commissionAmount = Math.round(((bookingRevenue * rate) / 100) * 100) / 100;

  const { error } = await sb.from('booking_commission_charges').insert({
    booking_id: bookingId,
    property_id: propertyId,
    property_subscription_id: subscription.id,
    booking_revenue_php: bookingRevenue,
    commission_rate_percent: rate,
    commission_amount_php: commissionAmount,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function countMarketingPublications(propertyId: string): Promise<number> {
  const sb = db();
  const { count, error } = await sb
    .from('marketing_publications')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('status', 'published');

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Blocks publish when Marketing Studio is off or per-property publish cap is reached. */
export async function requireMarketingPublishAllowed(
  propertyId: string
): Promise<ResolvedPropertyEntitlements> {
  const entitlements = await requirePropertyFeature(propertyId, 'marketingStudio');
  const limit = entitlements.marketingPublishLimitPerGroup;

  if (limit !== null && limit >= 0) {
    const count = await countMarketingPublications(propertyId);
    if (count >= limit) {
      throw new PlanFeatureRequiredError(
        'marketingPublishLimitPerGroup',
        `Marketing publish limit reached (${limit})`
      );
    }
  }

  return entitlements;
}
