/**
 * Formal email when Super Admin hard-rejects Tier 1 host verification.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { loadAuthUserProfile } from './authUserProfile.ts';
import { resolvePublicGuestAppOrigin } from './publicAppOrigin.ts';
import { escapeHtml, loadEmailTemplate, replacePlaceholders } from './renderEmailHtml.ts';

const RESEND_API = 'https://api.resend.com/emails';

export async function sendOrgVerificationRejectedEmail(opts: {
  supabase: SupabaseClient;
  ownerId: string;
  organizationName: string;
  rejectionReason: string;
}): Promise<void> {
  const owner = await loadAuthUserProfile(opts.supabase, opts.ownerId);
  if (!owner.email?.trim()) {
    console.warn('[orgVerificationEmail] owner has no email — skip rejection notify');
    return;
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  if (!resendKey || !fromEmail) {
    console.warn('[orgVerificationEmail] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skip');
    return;
  }

  const reason = opts.rejectionReason.trim();
  const rejectionReasonBlock = reason
    ? `<div style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #dc2626;background:#fef2f2;border-radius:8px;font-size:14px;line-height:1.5;color:#111827;"><p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#b91c1c;">Reason</p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(reason)}</p></div>`
    : '';

  const appOrigin = resolvePublicGuestAppOrigin(null);
  const applyUrl = `${appOrigin}/onboarding`;

  const template = await loadEmailTemplate('org-verification-rejected');
  const html = replacePlaceholders(template, {
    organization_name: escapeHtml(opts.organizationName),
    owner_name: escapeHtml(owner.name || 'there'),
    rejection_reason_block: rejectionReasonBlock,
    apply_url: applyUrl,
  });

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [owner.email],
      subject: `Host verification declined — ${opts.organizationName}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
  }
}
