/**
 * Creates PayMongo checkout links for property plan purchases and renewals.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { createPaymongoPaymentLink, phpToCentavos } from './paymongoClient.ts';
import { discountedPlanPricePhp } from './planPricing.ts';
import { computeMidCycleProration, type ProrationQuote } from './subscriptionProration.ts';
import { getPlatformPaymentSettings } from './subscriptionOrchestrator.ts';

export type CheckoutPurpose = 'initial' | 'renewal' | 'retry' | 'plan_switch';

/** PayMongo requires a positive minimum charge — floor for the rare case where a downgrade's
 * unused-time credit would otherwise fully (or more than) cover the new plan's price. Not a
 * zero-dollar-checkout bypass; that's a separate, out-of-scope feature (see plan doc Phase 7). */
const MINIMUM_CHECKOUT_AMOUNT_PHP = 20;

export type PropertyCheckoutResult = {
  checkoutUrl: string;
  transactionId: string;
  reused: boolean;
  /** Present when this checkout is a mid-cycle switch off an existing paid plan. */
  proration?: ProrationQuote;
};

function db() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env not configured');
  return createClient(url, key);
}

export async function createPropertySubscriptionCheckoutLink(input: {
  propertyId: string;
  planId: string;
  initiatedBy?: string | null;
  purpose?: CheckoutPurpose;
  forceNew?: boolean;
}): Promise<PropertyCheckoutResult> {
  const sb = db();
  const purpose = input.purpose ?? 'initial';

  const { data: property, error: propertyError } = await sb
    .from('properties')
    .select('id, name, organization_id')
    .eq('id', input.propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error('Property not found');

  const { data: plan, error: planError } = await sb
    .from('pricing_plans')
    .select('id, code, name, price_php, discount_percent, pricing_model, is_active, is_default')
    .eq('id', input.planId)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan || !plan.is_active) throw new Error('Plan not found');
  if (plan.pricing_model !== 'subscription') {
    throw new Error('Only subscription plans can be purchased');
  }
  if (plan.is_default) throw new Error('Free plan does not require checkout');
  if (plan.code === 'business_plus') {
    throw new Error('Business Plus is only available through org portfolio bundling');
  }

  // Status list kept identical to fulfillPropertySubscriptionPayment's `existingSub` lookup
  // (subscriptionOrchestrator.ts) — a suspended sub's period has always already lapsed, so
  // including it here doesn't change what gets charged, but keeping the two lists in sync avoids
  // this pricing check and the webhook-time period-start logic silently diverging later.
  const { data: liveSub } = await sb
    .from('property_subscriptions')
    .select('plan_id, price_php_snapshot, current_period_start, current_period_end')
    .eq('property_id', input.propertyId)
    .in('status', ['active', 'trialing', 'past_due', 'suspended'])
    .maybeSingle();

  const renewingSamePlan =
    purpose === 'renewal' ||
    (liveSub?.plan_id != null && String(liveSub.plan_id) === String(input.planId));

  const targetPricePhp = discountedPlanPricePhp(plan.price_php, plan.discount_percent);

  let proration: ProrationQuote | undefined;
  let amountPhp: number;

  if (renewingSamePlan) {
    amountPhp =
      liveSub?.price_php_snapshot != null && Number(liveSub.price_php_snapshot) > 0
        ? Number(liveSub.price_php_snapshot)
        : targetPricePhp;
  } else if (
    liveSub?.price_php_snapshot != null &&
    Number(liveSub.price_php_snapshot) > 0 &&
    liveSub.current_period_start &&
    liveSub.current_period_end
  ) {
    // Mid-cycle switch off a different active/trialing/past_due paid plan — prorate.
    proration = computeMidCycleProration({
      currentPricePhp: Number(liveSub.price_php_snapshot),
      currentPeriodStartIso: String(liveSub.current_period_start),
      currentPeriodEndIso: String(liveSub.current_period_end),
      targetPricePhp,
    });
    amountPhp = Math.max(MINIMUM_CHECKOUT_AMOUNT_PHP, proration.netDuePhp);
  } else {
    amountPhp = targetPricePhp;
  }

  if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
    throw new Error('Plan has no price configured');
  }

  const organizationId = property.organization_id as string;
  const propertyName = String(property.name ?? 'Property').trim();

  if (!input.forceNew) {
    const { data: pendingExisting } = await sb
      .from('property_payment_transactions')
      .select('id, checkout_url')
      .eq('property_id', input.propertyId)
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
  } else {
    await sb
      .from('property_payment_transactions')
      .update({ status: 'expired' })
      .eq('property_id', input.propertyId)
      .eq('plan_id', input.planId)
      .eq('status', 'pending');
  }

  const { data: txnRow, error: insertError } = await sb
    .from('property_payment_transactions')
    .insert({
      property_id: input.propertyId,
      organization_id: organizationId,
      plan_id: input.planId,
      amount: amountPhp,
      currency: 'PHP',
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertError) throw new Error(insertError.message);

  const transactionId = txnRow.id as string;

  const descriptionSuffix =
    purpose === 'renewal' ? ' renewal' : proration ? ' — mid-cycle switch' : '';

  try {
    await getPlatformPaymentSettings();
    const link = await createPaymongoPaymentLink({
      amountCentavos: phpToCentavos(amountPhp),
      description: `${propertyName} — ${plan.name} plan${descriptionSuffix}`,
      remarks: `property:${input.propertyId}`,
      metadata: {
        transaction_id: transactionId,
        property_id: input.propertyId,
        plan_id: input.planId,
        organization_id: organizationId,
        purpose: proration ? 'plan_switch' : purpose,
        ...(proration ? { proration_credit_php: String(proration.creditPhp) } : {}),
        ...(input.initiatedBy ? { initiated_by: input.initiatedBy } : {}),
      },
    });

    const { error: updateError } = await sb
      .from('property_payment_transactions')
      .update({
        provider_reference: link.id,
        checkout_url: link.checkoutUrl,
      })
      .eq('id', transactionId);
    if (updateError) throw new Error(updateError.message);

    return { checkoutUrl: link.checkoutUrl, transactionId, reused: false, proration };
  } catch (err) {
    await sb
      .from('property_payment_transactions')
      .update({
        status: 'failed',
        failure_reason: (err as Error).message.slice(0, 500),
      })
      .eq('id', transactionId);
    throw err;
  }
}
