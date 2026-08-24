/**
 * Creates PayMongo checkout links for org portfolio subscription purchases.
 * Mirrors propertySubscriptionCheckout.ts — see that file for the per-property equivalent.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { createPaymongoPaymentLink, phpToCentavos } from './paymongoClient.ts';
import { discountedPlanPricePhp } from './planPricing.ts';
import { getPlatformPaymentSettings } from './subscriptionOrchestrator.ts';

export type OrgCheckoutResult = {
  checkoutUrl: string;
  transactionId: string;
  reused: boolean;
};

function db() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

export async function createOrgSubscriptionCheckoutLink(input: {
  organizationId: string;
  planId: string;
  propertyIds: string[];
  initiatedBy?: string | null;
}): Promise<OrgCheckoutResult> {
  const sb = db();

  const { data: org, error: orgError } = await sb
    .from('organizations')
    .select('id, name')
    .eq('id', input.organizationId)
    .maybeSingle();
  if (orgError) throw new Error(orgError.message);
  if (!org) throw new Error('Organization not found');

  const { data: plan, error: planError } = await sb
    .from('pricing_plans')
    .select('id, name, price_php, discount_percent, pricing_model, is_active, max_properties')
    .eq('id', input.planId)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan || !plan.is_active) throw new Error('Plan not found');
  if (plan.pricing_model !== 'subscription') {
    throw new Error('Only subscription plans can be purchased');
  }
  if (plan.max_properties == null) throw new Error('Plan is not org-bundle-eligible');

  const uniquePropertyIds = Array.from(new Set(input.propertyIds));
  if (uniquePropertyIds.length === 0) throw new Error('Select at least one property');
  if (uniquePropertyIds.length > (plan.max_properties as number)) {
    throw new Error(`This plan covers up to ${plan.max_properties} properties`);
  }

  // Validate ownership + bundle-availability before money changes hands — createOrgSubscription
  // re-checks both at fulfillment time (authoritative, protects against a race between checkout
  // and webhook), but catching a bad request here avoids charging PayMongo for a checkout that
  // can never be fulfilled and would otherwise leave the transaction stuck `pending` forever.
  const { data: properties, error: propError } = await sb
    .from('properties')
    .select('id, organization_id')
    .in('id', uniquePropertyIds);
  if (propError) throw new Error(propError.message);
  if (!properties || properties.length !== uniquePropertyIds.length) {
    throw new Error('One or more properties not found');
  }
  if (properties.some((p) => (p.organization_id as string) !== input.organizationId)) {
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

  const { data: existingOrgSub } = await sb
    .from('org_subscriptions')
    .select('id')
    .eq('organization_id', input.organizationId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (existingOrgSub) {
    throw new Error('This organization already has an active portfolio subscription');
  }

  const amountPhp = discountedPlanPricePhp(plan.price_php, plan.discount_percent);
  if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
    throw new Error('Plan has no price configured');
  }

  const orgName = String(org.name ?? 'Organization').trim();

  const { data: pendingExisting } = await sb
    .from('org_payment_transactions')
    .select('id, checkout_url')
    .eq('organization_id', input.organizationId)
    .eq('plan_id', input.planId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingExisting?.checkout_url) {
    return {
      checkoutUrl: pendingExisting.checkout_url as string,
      transactionId: pendingExisting.id as string,
      reused: true,
    };
  }

  const { data: txnRow, error: insertError } = await sb
    .from('org_payment_transactions')
    .insert({
      organization_id: input.organizationId,
      plan_id: input.planId,
      property_ids: uniquePropertyIds,
      amount: amountPhp,
      currency: 'PHP',
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertError) throw new Error(insertError.message);

  const transactionId = txnRow.id as string;

  try {
    await getPlatformPaymentSettings();
    const link = await createPaymongoPaymentLink({
      amountCentavos: phpToCentavos(amountPhp),
      description: `${orgName} — ${plan.name} portfolio plan (${uniquePropertyIds.length} propert${uniquePropertyIds.length === 1 ? 'y' : 'ies'})`,
      remarks: `organization:${input.organizationId}`,
      metadata: {
        kind: 'org_subscription',
        transaction_id: transactionId,
        organization_id: input.organizationId,
        plan_id: input.planId,
        ...(input.initiatedBy ? { initiated_by: input.initiatedBy } : {}),
      },
    });

    const { error: updateError } = await sb
      .from('org_payment_transactions')
      .update({
        provider_reference: link.id,
        checkout_url: link.checkoutUrl,
      })
      .eq('id', transactionId);
    if (updateError) throw new Error(updateError.message);

    return { checkoutUrl: link.checkoutUrl, transactionId, reused: false };
  } catch (err) {
    await sb
      .from('org_payment_transactions')
      .update({
        status: 'failed',
        failure_reason: (err as Error).message.slice(0, 500),
      })
      .eq('id', transactionId);
    throw err;
  }
}
