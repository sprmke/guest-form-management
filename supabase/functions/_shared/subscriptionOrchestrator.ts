/**
 * Property subscription billing state machine — webhook + cron side effects only.
 * Mutates property_subscriptions + property_payment_transactions; never inline in handlers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { assignPropertyToPlan } from './planEntitlements.ts';
import { isPaymongoTestMode } from './paymongoClient.ts';
import { createPropertySubscriptionCheckoutLink } from './propertySubscriptionCheckout.ts';
import {
  sendSubscriptionPastDueEmail,
  sendSubscriptionPaymentFailedEmail,
  sendSubscriptionReceiptEmail,
  sendSubscriptionRenewalReminderEmail,
  sendSubscriptionSuspendedEmail,
} from './subscriptionBillingEmail.ts';
import { resolvePublicGuestAppOrigin } from './publicAppOrigin.ts';

export type PlatformPaymentSettings = {
  enabledPaymentMethods: string[];
  enabledBanks: string[];
  renewalLinkLeadDays: number;
  gracePeriodDays: number;
};

export type PropertyPaymentTransactionRow = {
  id: string;
  property_id: string;
  organization_id: string;
  property_subscription_id: string | null;
  plan_id: string;
  provider_reference: string | null;
  status: string;
  amount: number;
};

function db() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

export async function getPlatformPaymentSettings(): Promise<PlatformPaymentSettings> {
  const sb = db();
  const { data, error } = await sb
    .from('platform_payment_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const methods = data?.enabled_payment_methods;
  const banks = data?.enabled_banks;

  return {
    enabledPaymentMethods: Array.isArray(methods)
      ? methods.filter((m): m is string => typeof m === 'string')
      : ['qrph', 'paymaya', 'dob'],
    enabledBanks: Array.isArray(banks)
      ? banks.filter((b): b is string => typeof b === 'string')
      : [],
    renewalLinkLeadDays: Number(data?.renewal_link_lead_days ?? 5),
    gracePeriodDays: Number(data?.grace_period_days ?? 5),
  };
}

function addOneMonth(from: Date): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + 1);
  return end;
}

function formatManilaDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

async function loadPropertyBillingContext(propertyId: string) {
  const sb = db();
  const { data, error } = await sb
    .from('properties')
    .select(
      `
      id,
      name,
      slug,
      organization_id,
      organizations!inner ( id, owner_id, slug, name )
    `
    )
    .eq('id', propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Property not found');
  const org = (data as Record<string, unknown>).organizations as Record<string, unknown>;
  return {
    propertyId: data.id as string,
    propertyName: String(data.name ?? 'Property'),
    propertySlug: String(data.slug ?? ''),
    organizationId: org.id as string,
    ownerId: org.owner_id as string,
    orgSlug: String(org.slug ?? ''),
    orgName: String(org.name ?? ''),
  };
}

async function plansUrlForProperty(orgSlug: string, propertySlug: string): Promise<string> {
  const appOrigin = resolvePublicGuestAppOrigin(null);
  return `${appOrigin}/org/${orgSlug}/property/${propertySlug}/plans`;
}

export async function markPropertyPaymentFailed(
  transactionId: string,
  failureReason: string,
  rawPayload?: Record<string, unknown>
): Promise<void> {
  const sb = db();
  const { error } = await sb
    .from('property_payment_transactions')
    .update({
      status: 'failed',
      failure_reason: failureReason.slice(0, 500),
      raw_webhook_payload: rawPayload ?? null,
    })
    .eq('id', transactionId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
}

export async function fulfillPropertySubscriptionPayment(input: {
  transactionId: string;
  providerReference?: string | null;
  paymentMethodType?: string | null;
  paidAt?: string | null;
  rawPayload?: Record<string, unknown>;
  assignedByUserId?: string | null;
}): Promise<void> {
  const sb = db();

  const { data: txn, error: txnError } = await sb
    .from('property_payment_transactions')
    .select('*')
    .eq('id', input.transactionId)
    .maybeSingle();
  if (txnError) throw new Error(txnError.message);
  if (!txn) throw new Error('Payment transaction not found');
  if (txn.status === 'paid') return;

  const propertyId = txn.property_id as string;
  const planId = txn.plan_id as string;
  const assignedBy = input.assignedByUserId ?? null;
  const amountPhp = Number(txn.amount ?? 0);

  const { data: existingSub } = await sb
    .from('property_subscriptions')
    .select('id, current_period_end, status')
    .eq('property_id', propertyId)
    .in('status', ['active', 'trialing', 'past_due', 'suspended'])
    .maybeSingle();

  await assignPropertyToPlan(propertyId, planId, assignedBy, {
    note: 'Paid via PayMongo checkout',
  });

  const now = new Date();
  const existingEnd =
    existingSub?.current_period_end != null
      ? new Date(String(existingSub.current_period_end))
      : null;
  const periodStart = existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
  const periodEnd = addOneMonth(periodStart);

  const { data: subscription, error: subLookupError } = await sb
    .from('property_subscriptions')
    .select('id, plan_id, pricing_plans!inner(name)')
    .eq('property_id', propertyId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (subLookupError) throw new Error(subLookupError.message);
  if (!subscription) throw new Error('Subscription missing after payment fulfillment');

  const { error: subUpdateError } = await sb
    .from('property_subscriptions')
    .update({
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      grace_period_ends_at: null,
      status: 'active',
    })
    .eq('id', subscription.id);
  if (subUpdateError) throw new Error(subUpdateError.message);

  const paidAt = input.paidAt ?? new Date().toISOString();
  const { error: txnUpdateError } = await sb
    .from('property_payment_transactions')
    .update({
      status: 'paid',
      property_subscription_id: subscription.id,
      provider_reference: input.providerReference ?? txn.provider_reference,
      payment_method_type: input.paymentMethodType ?? null,
      paid_at: paidAt,
      raw_webhook_payload: input.rawPayload ?? null,
    })
    .eq('id', input.transactionId);
  if (txnUpdateError) throw new Error(txnUpdateError.message);

  try {
    const ctx = await loadPropertyBillingContext(propertyId);
    const planJoin = (subscription as Record<string, unknown>).pricing_plans as Record<
      string,
      unknown
    >;
    await sendSubscriptionReceiptEmail({
      supabase: sb,
      ownerId: ctx.ownerId,
      propertyName: ctx.propertyName,
      planName: String(planJoin.name ?? 'Plan'),
      amountPhp,
      orgSlug: ctx.orgSlug,
      propertySlug: ctx.propertySlug,
    });
  } catch (err) {
    console.error('[subscriptionOrchestrator] receipt email failed', err);
  }
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function resolveTransactionFromWebhookPayload(
  payload: Record<string, unknown>
): Promise<PropertyPaymentTransactionRow | null> {
  const sb = db();
  const attrs = (payload.data as Record<string, unknown> | undefined)?.attributes as
    Record<string, unknown> | undefined;
  const inner = attrs?.data as Record<string, unknown> | undefined;
  const innerAttrs = inner?.attributes as Record<string, unknown> | undefined;
  const metadata = innerAttrs?.metadata ?? attrs?.metadata;

  const transactionId = readMetadataString(metadata, 'transaction_id');
  if (transactionId) {
    const { data } = await sb
      .from('property_payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();
    return (data as PropertyPaymentTransactionRow | null) ?? null;
  }

  const linkId =
    (inner?.type === 'link' ? String(inner.id ?? '') : '') ||
    readMetadataString(metadata, 'link_id') ||
    (typeof innerAttrs?.payment_intent_id === 'string' ? null : null);

  const providerRef =
    linkId || (inner?.type === 'payment' && typeof inner.id === 'string' ? inner.id : null) || null;

  if (!providerRef) return null;

  const { data } = await sb
    .from('property_payment_transactions')
    .select('*')
    .eq('provider_reference', providerRef)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PropertyPaymentTransactionRow | null) ?? null;
}

export async function handlePaymongoWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ handled: boolean; action?: string }> {
  const normalized = eventType.toLowerCase();

  if (normalized === 'payment.failed') {
    const txn = await resolveTransactionFromWebhookPayload(payload);
    if (!txn || txn.status !== 'pending') return { handled: false };
    await markPropertyPaymentFailed(txn.id, 'Payment failed', payload);
    try {
      const ctx = await loadPropertyBillingContext(txn.property_id);
      const plansUrl = await plansUrlForProperty(ctx.orgSlug, ctx.propertySlug);
      await sendSubscriptionPaymentFailedEmail({
        supabase: db(),
        ownerId: ctx.ownerId,
        propertyName: ctx.propertyName,
        plansUrl,
      });
    } catch (err) {
      console.error('[subscriptionOrchestrator] payment failed email', err);
    }
    return { handled: true, action: 'marked_failed' };
  }

  if (
    normalized === 'payment.paid' ||
    normalized === 'link.payment.paid' ||
    normalized === 'checkout_session.payment.paid'
  ) {
    const txn = await resolveTransactionFromWebhookPayload(payload);
    if (!txn) return { handled: false };

    const attrs = (payload.data as Record<string, unknown> | undefined)?.attributes as
      Record<string, unknown> | undefined;
    const inner = attrs?.data as Record<string, unknown> | undefined;
    const innerAttrs = inner?.attributes as Record<string, unknown> | undefined;
    const metadata = innerAttrs?.metadata ?? attrs?.metadata;
    const initiatedBy = readMetadataString(metadata, 'initiated_by');
    const source = innerAttrs?.source as Record<string, unknown> | undefined;
    const paymentMethodType = typeof source?.type === 'string' ? source.type : null;

    const paidAtEpoch = innerAttrs?.paid_at;
    const paidAt =
      typeof paidAtEpoch === 'number'
        ? new Date(paidAtEpoch * 1000).toISOString()
        : new Date().toISOString();

    await fulfillPropertySubscriptionPayment({
      transactionId: txn.id,
      providerReference: txn.provider_reference,
      paymentMethodType,
      paidAt,
      rawPayload: payload,
      assignedByUserId: initiatedBy,
    });

    return { handled: true, action: 'fulfilled_subscription' };
  }

  return { handled: false };
}

export function paymongoLivemodeFromEnv(): boolean {
  return !isPaymongoTestMode();
}

type PaidPlanSubscriptionRow = {
  id: string;
  property_id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  pricing_plans: { is_default: boolean; name: string; is_active: boolean };
};

export async function runPlatformBillingCycle(): Promise<Record<string, number>> {
  const sb = db();
  const settings = await getPlatformPaymentSettings();
  const now = new Date();
  const counters = {
    renewalLinks: 0,
    pastDue: 0,
    suspended: 0,
    graceRetries: 0,
    errors: 0,
  };

  const leadMs = settings.renewalLinkLeadDays * 24 * 60 * 60 * 1000;

  const { data: subs, error: subsError } = await sb
    .from('property_subscriptions')
    .select(
      `
      id,
      property_id,
      organization_id,
      plan_id,
      status,
      current_period_end,
      pricing_plans!inner ( is_default, name, is_active )
    `
    )
    .in('status', ['active', 'past_due'])
    .not('current_period_end', 'is', null);
  if (subsError) throw new Error(subsError.message);

  for (const raw of subs ?? []) {
    const sub = raw as unknown as PaidPlanSubscriptionRow;
    if (!sub.pricing_plans?.is_active || sub.pricing_plans.is_default) continue;

    const periodEnd = new Date(String(sub.current_period_end));
    const ctxPromise = loadPropertyBillingContext(sub.property_id);

    if (sub.status === 'active') {
      const msUntilEnd = periodEnd.getTime() - now.getTime();
      if (msUntilEnd <= leadMs && msUntilEnd > 0) {
        try {
          const checkout = await createPropertySubscriptionCheckoutLink({
            propertyId: sub.property_id,
            planId: sub.plan_id,
            purpose: 'renewal',
          });
          const ctx = await ctxPromise;
          await sendSubscriptionRenewalReminderEmail({
            supabase: sb,
            ownerId: ctx.ownerId,
            propertyName: ctx.propertyName,
            planName: sub.pricing_plans.name,
            periodEndLabel: formatManilaDate(periodEnd.toISOString()),
            checkoutUrl: checkout.checkoutUrl,
          });
          counters.renewalLinks += 1;
        } catch (err) {
          console.error('[platform-billing-cron] renewal link', sub.property_id, err);
          counters.errors += 1;
        }
      }

      if (periodEnd.getTime() <= now.getTime()) {
        const graceEnd = new Date(now);
        graceEnd.setDate(graceEnd.getDate() + settings.gracePeriodDays);
        const { error } = await sb
          .from('property_subscriptions')
          .update({
            status: 'past_due',
            grace_period_ends_at: graceEnd.toISOString(),
          })
          .eq('id', sub.id)
          .eq('status', 'active');
        if (error) {
          counters.errors += 1;
          continue;
        }
        try {
          const checkout = await createPropertySubscriptionCheckoutLink({
            propertyId: sub.property_id,
            planId: sub.plan_id,
            purpose: 'retry',
            forceNew: true,
          });
          const ctx = await ctxPromise;
          await sendSubscriptionPastDueEmail({
            supabase: sb,
            ownerId: ctx.ownerId,
            propertyName: ctx.propertyName,
            graceEndLabel: formatManilaDate(graceEnd.toISOString()),
            checkoutUrl: checkout.checkoutUrl,
          });
          counters.pastDue += 1;
        } catch (err) {
          console.error('[platform-billing-cron] past due', sub.property_id, err);
          counters.errors += 1;
        }
      }
      continue;
    }

    if (sub.status === 'past_due') {
      const { data: graceRow } = await sb
        .from('property_subscriptions')
        .select('grace_period_ends_at')
        .eq('id', sub.id)
        .maybeSingle();
      const graceEndRaw = graceRow?.grace_period_ends_at as string | null;
      if (graceEndRaw && new Date(graceEndRaw).getTime() <= now.getTime()) {
        const { error } = await sb
          .from('property_subscriptions')
          .update({ status: 'suspended' })
          .eq('id', sub.id)
          .eq('status', 'past_due');
        if (error) {
          counters.errors += 1;
          continue;
        }
        try {
          const ctx = await ctxPromise;
          const plansUrl = await plansUrlForProperty(ctx.orgSlug, ctx.propertySlug);
          await sendSubscriptionSuspendedEmail({
            supabase: sb,
            ownerId: ctx.ownerId,
            propertyName: ctx.propertyName,
            plansUrl,
          });
          counters.suspended += 1;
        } catch (err) {
          console.error('[platform-billing-cron] suspended email', sub.property_id, err);
          counters.errors += 1;
        }
      }
    }
  }

  return counters;
}

export async function adminExtendPropertySubscription(input: {
  propertyId: string;
  periodEndIso: string;
  status?: 'active' | 'past_due' | 'suspended' | 'canceled';
  note?: string | null;
  adminUserId: string;
}): Promise<void> {
  const sb = db();
  const { data: sub, error } = await sb
    .from('property_subscriptions')
    .select('id')
    .eq('property_id', input.propertyId)
    .in('status', ['active', 'trialing', 'past_due', 'suspended'])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!sub) throw new Error('No live subscription for property');

  const patch: Record<string, unknown> = {
    current_period_end: input.periodEndIso,
    grace_period_ends_at: null,
  };
  if (input.status) patch.status = input.status;

  const { error: updateError } = await sb
    .from('property_subscriptions')
    .update(patch)
    .eq('id', sub.id);
  if (updateError) throw new Error(updateError.message);

  await sb.from('property_subscription_events').insert({
    property_subscription_id: sub.id,
    event_type: 'status_changed',
    new_status: input.status ?? 'active',
    note: input.note ?? 'Super-admin manual billing extension',
    created_by: input.adminUserId,
  });
}
