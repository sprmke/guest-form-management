/**
 * Owner emails for property subscription billing (PayMongo).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { loadAuthUserProfile } from './authUserProfile.ts';
import { escapeHtml } from './renderEmailHtml.ts';
import { resolvePublicGuestAppOrigin } from './publicAppOrigin.ts';

const RESEND_API = 'https://api.resend.com/emails';

async function sendOwnerBillingEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  subject: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const owner = await loadAuthUserProfile(opts.supabase, opts.ownerId);
  if (!owner.email?.trim()) {
    console.warn('[subscriptionBillingEmail] owner has no email — skip');
    return false;
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  if (!resendKey || !fromEmail) {
    console.warn('[subscriptionBillingEmail] RESEND missing — skip');
    return false;
  }

  const ctaBlock =
    opts.ctaUrl && opts.ctaLabel
      ? `<p style="margin:24px 0 0 0;"><a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(opts.ctaLabel)}</a></p>`
      : '';

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#111827;">
<p style="margin:0 0 12px 0;">Hi ${escapeHtml(owner.name || 'there')},</p>
<p style="margin:0 0 12px 0;font-size:17px;font-weight:600;">${escapeHtml(opts.headline)}</p>
<p style="margin:0;">${escapeHtml(opts.body)}</p>
${ctaBlock}
</div>`;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Kame Homes <${fromEmail}>`,
      to: [owner.email.trim()],
      subject: opts.subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[subscriptionBillingEmail] send failed', res.status, body.slice(0, 200));
    return false;
  }
  return true;
}

export async function sendSubscriptionReceiptEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  propertyName: string;
  planName: string;
  amountPhp: number;
  orgSlug: string;
  propertySlug: string;
}): Promise<void> {
  const appOrigin = resolvePublicGuestAppOrigin(null);
  const plansUrl = `${appOrigin}/org/${opts.orgSlug}/property/${opts.propertySlug}/plans`;
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Payment received — ${opts.propertyName}`,
    headline: 'Subscription payment confirmed',
    body: `${opts.propertyName} is now on ${opts.planName} (₱${opts.amountPhp.toLocaleString('en-PH')}). Your plan is active for the next billing period.`,
    ctaLabel: 'View plan',
    ctaUrl: plansUrl,
  });
}

export async function sendSubscriptionRenewalReminderEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  propertyName: string;
  planName: string;
  periodEndLabel: string;
  checkoutUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Renew ${opts.propertyName} — ${opts.planName}`,
    headline: 'Subscription renewal due soon',
    body: `${opts.propertyName} renews on ${opts.periodEndLabel}. Pay now to avoid interruption.`,
    ctaLabel: 'Pay renewal',
    ctaUrl: opts.checkoutUrl,
  });
}

export async function sendSubscriptionPastDueEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  propertyName: string;
  graceEndLabel: string;
  checkoutUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Past due — ${opts.propertyName}`,
    headline: 'Subscription payment is past due',
    body: `Pay before ${opts.graceEndLabel} to keep full dashboard access for this listing.`,
    ctaLabel: 'Pay now',
    ctaUrl: opts.checkoutUrl,
  });
}

export async function sendSubscriptionSuspendedEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  propertyName: string;
  plansUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Suspended — ${opts.propertyName}`,
    headline: 'Listing subscription suspended',
    body: `${opts.propertyName} is in read-only mode until payment is received. Guest booking flows are unaffected.`,
    ctaLabel: 'Restore access',
    ctaUrl: opts.plansUrl,
  });
}

export async function sendSubscriptionPaymentFailedEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  propertyName: string;
  plansUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Payment failed — ${opts.propertyName}`,
    headline: 'Payment could not be completed',
    body: `Your recent payment attempt for ${opts.propertyName} did not go through. You can try again from the Plans page.`,
    ctaLabel: 'Try again',
    ctaUrl: opts.plansUrl,
  });
}

/** Org-level equivalents — billing is org-scoped, so these name the org and enrolled property
 * count instead of a single property. */

export async function sendOrgSubscriptionReceiptEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  orgName: string;
  planName: string;
  propertyCount: number;
  amountPhp: number;
  orgSlug: string;
}): Promise<void> {
  const appOrigin = resolvePublicGuestAppOrigin(null);
  const plansUrl = `${appOrigin}/org/${opts.orgSlug}/plans`;
  const propertyWord = opts.propertyCount === 1 ? 'property' : 'properties';
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Payment received — ${opts.orgName}`,
    headline: 'Subscription payment confirmed',
    body: `${opts.orgName} is now on ${opts.planName} covering ${opts.propertyCount} ${propertyWord} (₱${opts.amountPhp.toLocaleString('en-PH')}). Your plan is active for the next billing period.`,
    ctaLabel: 'View plan',
    ctaUrl: plansUrl,
  });
}

export async function sendOrgSubscriptionRenewalReminderEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  orgName: string;
  planName: string;
  periodEndLabel: string;
  checkoutUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Renew ${opts.orgName} — ${opts.planName}`,
    headline: 'Subscription renewal due soon',
    body: `${opts.orgName}'s subscription renews on ${opts.periodEndLabel}. Pay now to avoid interruption.`,
    ctaLabel: 'Pay renewal',
    ctaUrl: opts.checkoutUrl,
  });
}

export async function sendOrgSubscriptionPastDueEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  orgName: string;
  graceEndLabel: string;
  checkoutUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Past due — ${opts.orgName}`,
    headline: 'Subscription payment is past due',
    body: `Pay before ${opts.graceEndLabel} to keep full dashboard access across ${opts.orgName}'s properties.`,
    ctaLabel: 'Pay now',
    ctaUrl: opts.checkoutUrl,
  });
}

export async function sendOrgSubscriptionSuspendedEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  orgName: string;
  plansUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Suspended — ${opts.orgName}`,
    headline: 'Subscription suspended',
    body: `${opts.orgName}'s properties are in read-only mode until payment is received. Guest booking flows are unaffected.`,
    ctaLabel: 'Restore access',
    ctaUrl: opts.plansUrl,
  });
}

export async function sendOrgSubscriptionPaymentFailedEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  orgName: string;
  plansUrl: string;
}): Promise<void> {
  await sendOwnerBillingEmail({
    supabase: opts.supabase,
    ownerId: opts.ownerId,
    subject: `Payment failed — ${opts.orgName}`,
    headline: 'Payment could not be completed',
    body: `Your recent payment attempt for ${opts.orgName} did not go through. You can try again from the Plans page.`,
    ctaLabel: 'Try again',
    ctaUrl: opts.plansUrl,
  });
}
