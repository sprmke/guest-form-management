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
import { normalizePermissionIds } from './propertyTeamPermissions.ts';

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

/**
 * Org-level portfolio bundle (Pro/Business/Business Plus) covering this property, if any —
 * see docs/workflow/planned/pricing-portfolio-bundling.md. Checked before the per-property
 * subscription; a property slotted into a live org bundle is entitled from that plan instead.
 */
export async function getActiveOrgSubscriptionForProperty(
  propertyId: string
): Promise<PropertySubscriptionRow | null> {
  const sb = db();

  const { data: slot, error: slotError } = await sb
    .from('org_subscription_properties')
    .select('org_subscription_id')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (slotError) throw new Error(slotError.message);
  if (!slot) return null;

  const { data, error } = await sb
    .from('org_subscriptions')
    .select(
      `
      id,
      organization_id,
      plan_id,
      pricing_model,
      price_php_snapshot,
      status,
      current_period_start,
      current_period_end,
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
    .eq('id', slot.org_subscription_id as string)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const plan = (data as Record<string, unknown>).pricing_plans as PricingPlanRow;
  const { pricing_plans: _planJoin, ...sub } = data as Record<string, unknown>;
  return { ...serializeSubscription(sub, plan), propertyId };
}

export async function resolvePropertyEntitlements(
  propertyId: string
): Promise<ResolvedPropertyEntitlements> {
  let subscription =
    (await getActiveOrgSubscriptionForProperty(propertyId)) ??
    (await getActivePropertySubscription(propertyId));

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

  // Was querying the nonexistent 'property_team_invitations' table (real name:
  // 'property_invitations'), so this always threw once a plan had a finite maxMembers — every
  // invite on Free/Starter/etc. errored instead of enforcing the cap.
  const { count: inviteCount, error: inviteError } = await sb
    .from('property_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('status', 'pending');
  if (inviteError) throw new Error(inviteError.message);

  // The owner (and any org-level admins with implicit full property access) never get a
  // property_members row but still occupy a seat — the client's countPropertyTeamSlotsUsed
  // counts them via listPropertyTeamMembers' virtual entries. Match that here so a request that
  // reaches the server isn't allowed to invite past what the client already blocked.
  const { data: property, error: propertyError } = await sb
    .from('properties')
    .select('organization_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error('Property not found');

  const { count: orgAdminCount, error: orgAdminError } = await sb
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', property.organization_id as string)
    .eq('status', 'active')
    .eq('role_id', 'ADMIN');
  if (orgAdminError) throw new Error(orgAdminError.message);

  const ownerSlot = 1;
  return ownerSlot + (orgAdminCount ?? 0) + (memberCount ?? 0) + (inviteCount ?? 0);
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

export type TeamSeatReconciliation = {
  /** Real member budget after subtracting the owner + org-admin virtual slots, null = unlimited. */
  budget: number | null;
  activeCount: number;
  deactivatedMemberIds: string[];
  reactivatedMemberIds: string[];
};

/**
 * Keeps property_members in sync with the property's *current* team-seat entitlement after any
 * event that can change it — a plan switch (up or down), a subscription lapsing to suspended, an
 * org-bundle slot/unslot, or an invite accepted while already at the cap. Never deletes a row:
 * over budget, the newest active members are switched to inactive with plan_limited=true (their
 * permissions stashed in saved_permissions, same shape a manual deactivate already uses); once
 * budget frees up — a later upgrade, or an admin manually deactivating someone else first — the
 * longest-waiting plan_limited members are restored automatically, oldest first. A manual
 * deactivation (plan_limited stays false) is never touched by this function; only seats this
 * function itself took away get auto-restored.
 *
 * Deliberately does not enforce assertNotLastPropertyTeamManager's "keep one manager" rule — the
 * seat cap is a hard constraint that must hold regardless, and the org owner (never a
 * property_members row, always full permissions) is the permanent fallback manager.
 */
export async function reconcilePropertyTeamSeats(
  propertyId: string
): Promise<TeamSeatReconciliation> {
  const sb = db();
  const entitlements = await resolvePropertyEntitlements(propertyId);
  const maxMembers = entitlements.teamManagement.enabled
    ? entitlements.teamManagement.maxMembers
    : 0;

  const result: TeamSeatReconciliation = {
    budget: null,
    activeCount: 0,
    deactivatedMemberIds: [],
    reactivatedMemberIds: [],
  };

  const { data: property, error: propertyError } = await sb
    .from('properties')
    .select('organization_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) return result;

  let budget: number | null = null;
  if (maxMembers !== null) {
    const { count: orgAdminCount, error: orgAdminError } = await sb
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', property.organization_id as string)
      .eq('status', 'active')
      .eq('role_id', 'ADMIN');
    if (orgAdminError) throw new Error(orgAdminError.message);
    const virtualSlotsUsed = 1 + (orgAdminCount ?? 0); // owner + org-level admins
    budget = Math.max(0, maxMembers - virtualSlotsUsed);
  }
  result.budget = budget;

  const { data: rows, error: rowsError } = await sb
    .from('property_members')
    .select('id, status, plan_limited, permissions, saved_permissions')
    .eq('property_id', propertyId)
    .order('assigned_at', { ascending: true });
  if (rowsError) throw new Error(rowsError.message);
  const members = rows ?? [];

  const active = members.filter((m) => m.status === 'active');
  result.activeCount = active.length;

  if (budget === null) {
    // Unlimited — restore every seat this function previously took away.
    const toRestore = members.filter((m) => m.status === 'inactive' && m.plan_limited === true);
    for (const m of toRestore) {
      const { error } = await sb
        .from('property_members')
        .update({
          status: 'active',
          permissions: normalizePermissionIds(m.saved_permissions),
          saved_permissions: null,
          plan_limited: false,
        })
        .eq('id', m.id as string);
      if (error) throw new Error(error.message);
      result.reactivatedMemberIds.push(m.id as string);
    }
    return result;
  }

  if (active.length > budget) {
    // Newest-assigned first (rows are already ordered assigned_at ASC).
    const overBy = active.length - budget;
    const toDeactivate = active.slice(active.length - overBy);
    for (const m of toDeactivate) {
      const { error } = await sb
        .from('property_members')
        .update({
          status: 'inactive',
          saved_permissions: normalizePermissionIds(m.permissions),
          permissions: [],
          plan_limited: true,
        })
        .eq('id', m.id as string);
      if (error) throw new Error(error.message);
      result.deactivatedMemberIds.push(m.id as string);
    }
    result.activeCount = budget;
  } else if (active.length < budget) {
    const room = budget - active.length;
    const restorable = members
      .filter((m) => m.status === 'inactive' && m.plan_limited === true)
      .slice(0, room); // already assigned_at ASC — oldest/longest-tenured restored first
    for (const m of restorable) {
      const { error } = await sb
        .from('property_members')
        .update({
          status: 'active',
          permissions: normalizePermissionIds(m.saved_permissions),
          saved_permissions: null,
          plan_limited: false,
        })
        .eq('id', m.id as string);
      if (error) throw new Error(error.message);
      result.reactivatedMemberIds.push(m.id as string);
    }
    result.activeCount = active.length + restorable.length;
  }

  return result;
}

export async function requireTelegramNotificationsEnabled(propertyId: string): Promise<void> {
  await requirePropertyFeature(propertyId, 'telegramNotifications');
}

async function firstActivePropertyIdForOrg(orgId: string): Promise<string | null> {
  const sb = db();

  // Prefer a property already covered by a live org portfolio bundle — resolving entitlements
  // from it (via resolvePropertyEntitlements' org-bundle-first check) gives parking the org's
  // real bundled plan instead of falling through to whatever an unrelated property happens to
  // have. Closes part of the PARKING_INTERIM_UNGATED_FEATURES carve-out (see plans-feature-matrix.md).
  const { data: bundled, error: bundledError } = await sb
    .from('org_subscription_properties')
    .select('property_id, org_subscriptions!inner (organization_id, status)')
    .eq('org_subscriptions.organization_id', orgId)
    .in('org_subscriptions.status', ['active', 'trialing', 'past_due'])
    .limit(1)
    .maybeSingle();
  if (bundledError) throw new Error(bundledError.message);
  if (bundled?.property_id) return String(bundled.property_id);

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

/** Property-scoped Telegram uses the property id; parking uses the org's first active property
 * (preferring one covered by a live org portfolio bundle, if any — see above). */
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

async function writeOrgSubscriptionEvent(input: {
  orgSubscriptionId: string;
  eventType: 'assigned' | 'plan_changed' | 'status_changed' | 'property_added' | 'property_removed';
  previousPlanId?: string | null;
  newPlanId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  propertyId?: string | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  const sb = db();
  const { error } = await sb.from('org_subscription_events').insert({
    org_subscription_id: input.orgSubscriptionId,
    event_type: input.eventType,
    previous_plan_id: input.previousPlanId ?? null,
    new_plan_id: input.newPlanId ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    property_id: input.propertyId ?? null,
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
  if (plan.code === 'business_plus') {
    throw new Error('Business Plus is only available through org portfolio bundling');
  }
  if (plan.pricing_model === 'commission') {
    throw new Error('Commission pricing is not available');
  }

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
  await reconcilePropertyTeamSeats(propertyId);

  const result = await getActivePropertySubscription(propertyId);
  if (!result) throw new Error('Failed to load property subscription after assign');
  return result;
}

type OrgBundlePlanRow = PricingPlanRow & {
  discount_percent: number | null;
  max_properties: number | null;
};

async function loadOrgBundlePlan(planId: string): Promise<OrgBundlePlanRow> {
  const sb = db();
  const { data: plan, error: planError } = await sb
    .from('pricing_plans')
    .select(
      'id, code, name, pricing_model, price_php, discount_percent, commission_rate_percent, features, is_default, max_properties'
    )
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error('Pricing plan not found or inactive');
  if (plan.max_properties == null) {
    throw new Error('This plan is not org-bundle-eligible');
  }
  return plan as OrgBundlePlanRow;
}

/** Creates a new org portfolio subscription and slots the given properties into it. */
export async function createOrgSubscription(
  organizationId: string,
  planId: string,
  propertyIds: string[],
  assignedBy: string | null
): Promise<{ orgSubscriptionId: string }> {
  const sb = db();
  const plan = await loadOrgBundlePlan(planId);
  const maxProperties = plan.max_properties as number;

  if (propertyIds.length === 0) throw new Error('Select at least one property');
  if (propertyIds.length > maxProperties) {
    throw new Error(`This plan covers up to ${maxProperties} properties`);
  }

  const uniquePropertyIds = Array.from(new Set(propertyIds));

  const { data: properties, error: propError } = await sb
    .from('properties')
    .select('id, organization_id')
    .in('id', uniquePropertyIds);
  if (propError) throw new Error(propError.message);
  if (!properties || properties.length !== uniquePropertyIds.length) {
    throw new Error('One or more properties not found');
  }
  if (properties.some((p) => (p.organization_id as string) !== organizationId)) {
    throw new Error('All properties must belong to this organization');
  }

  const { data: existingSlots, error: slotError } = await sb
    .from('org_subscription_properties')
    .select('property_id')
    .in('property_id', uniquePropertyIds);
  if (slotError) throw new Error(slotError.message);
  if (existingSlots && existingSlots.length > 0) {
    throw new Error('One or more properties are already covered by a portfolio subscription');
  }

  const { data: existingOrgSub, error: existingOrgSubError } = await sb
    .from('org_subscriptions')
    .select('id')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (existingOrgSubError) throw new Error(existingOrgSubError.message);
  if (existingOrgSub) {
    throw new Error('This organization already has an active portfolio subscription');
  }

  const checkoutPricePhp = discountedPlanPricePhp(plan.price_php, plan.discount_percent);

  const { data: inserted, error: insertError } = await sb
    .from('org_subscriptions')
    .insert({
      organization_id: organizationId,
      plan_id: planId,
      pricing_model: 'subscription',
      price_php_snapshot: checkoutPricePhp,
      max_properties_snapshot: maxProperties,
      status: 'active',
    })
    .select('id')
    .single();
  if (insertError) throw new Error(insertError.message);
  const orgSubscriptionId = inserted.id as string;

  // supabase-js REST calls aren't wrapped in a real DB transaction, so a failure partway through
  // property assignment (e.g. a property got slotted by a concurrent request between the
  // existingSlots check above and this loop — the DB unique index rejects it, this doesn't
  // silently corrupt state, but does throw) must not leave a live `active` org_subscriptions row
  // covering fewer properties than were paid for. Clean up on any failure here so the caller sees
  // one clear error instead of an orphaned, half-slotted bundle.
  try {
    await writeOrgSubscriptionEvent({
      orgSubscriptionId,
      eventType: 'assigned',
      newPlanId: planId,
      newStatus: 'active',
      createdBy: assignedBy,
    });

    for (const propertyId of uniquePropertyIds) {
      const { error: assignError } = await sb.from('org_subscription_properties').insert({
        org_subscription_id: orgSubscriptionId,
        property_id: propertyId,
        assigned_by: assignedBy,
      });
      if (assignError) throw new Error(assignError.message);
      await writeOrgSubscriptionEvent({
        orgSubscriptionId,
        eventType: 'property_added',
        propertyId,
        createdBy: assignedBy,
      });
    }

    const features = parsePlanFeatures(plan.features);
    await syncAiCreditsFromPlan(
      organizationId,
      plan.code,
      features.aiMonthlyCreditAllowance,
      assignedBy ?? 'system'
    );
    for (const propertyId of uniquePropertyIds) {
      await reconcilePropertyTeamSeats(propertyId);
    }
  } catch (err) {
    // org_subscription_properties/org_subscription_events cascade-delete via FK (ON DELETE CASCADE).
    await sb.from('org_subscriptions').delete().eq('id', orgSubscriptionId);
    throw err;
  }

  return { orgSubscriptionId };
}

/** Adds one more property to an existing live org portfolio subscription, enforcing its cap. */
export async function assignPropertyToOrgSubscription(
  orgSubscriptionId: string,
  propertyId: string,
  assignedBy: string | null
): Promise<void> {
  const sb = db();

  const { data: orgSub, error: orgSubError } = await sb
    .from('org_subscriptions')
    .select('id, organization_id, max_properties_snapshot')
    .eq('id', orgSubscriptionId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (orgSubError) throw new Error(orgSubError.message);
  if (!orgSub) throw new Error('Org subscription not found or not active');

  const { data: property, error: propertyError } = await sb
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error('Property not found');
  if ((property.organization_id as string) !== (orgSub.organization_id as string)) {
    throw new Error('Property must belong to the same organization');
  }

  const { data: existingSlot, error: slotError } = await sb
    .from('org_subscription_properties')
    .select('property_id')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (slotError) throw new Error(slotError.message);
  if (existingSlot) throw new Error('Property is already covered by a portfolio subscription');

  const { count, error: countError } = await sb
    .from('org_subscription_properties')
    .select('id', { count: 'exact', head: true })
    .eq('org_subscription_id', orgSubscriptionId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= (orgSub.max_properties_snapshot as number)) {
    throw new Error(
      `This plan covers up to ${orgSub.max_properties_snapshot as number} properties`
    );
  }

  const { error: insertError } = await sb.from('org_subscription_properties').insert({
    org_subscription_id: orgSubscriptionId,
    property_id: propertyId,
    assigned_by: assignedBy,
  });
  if (insertError) throw new Error(insertError.message);

  await writeOrgSubscriptionEvent({
    orgSubscriptionId,
    eventType: 'property_added',
    propertyId,
    createdBy: assignedBy,
  });
  await reconcilePropertyTeamSeats(propertyId);
}

/** Removes a property from its org portfolio subscription — falls back to Free (or its own
 * independent plan) via the usual resolvePropertyEntitlements fallback, same as the plan doc. */
export async function removePropertyFromOrgSubscription(
  propertyId: string,
  removedBy: string | null
): Promise<void> {
  const sb = db();

  const { data: slot, error: slotError } = await sb
    .from('org_subscription_properties')
    .select('id, org_subscription_id')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (slotError) throw new Error(slotError.message);
  if (!slot) return;

  const { error: deleteError } = await sb
    .from('org_subscription_properties')
    .delete()
    .eq('id', slot.id as string);
  if (deleteError) throw new Error(deleteError.message);

  await writeOrgSubscriptionEvent({
    orgSubscriptionId: slot.org_subscription_id as string,
    eventType: 'property_removed',
    propertyId,
    createdBy: removedBy,
  });
  await reconcilePropertyTeamSeats(propertyId);
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
