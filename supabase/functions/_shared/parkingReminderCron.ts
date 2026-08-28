/**
 * Phase 7 — pre-arrival parking reminder. Guests who signaled `need_parking` on the property
 * guest form no longer see vehicle/date fields there (see `guestFormSteps.ts`) — this is the
 * nudge that gets them into the marketplace self-serve flow before their stay, for anyone who
 * hasn't already linked a marketplace booking on their own from the confirmation touchpoints
 * (`GuestFormSuccess.tsx`, the booking-acknowledgement email).
 *
 * Mirrors `parkingBroadcastExpireCron.ts`'s cron-secret + sweep shape.
 */

import {
  calendarDaysBetween,
  manilaTodayYmd,
  normalizeBookingDateToYmd,
} from './calendarAvailabilityManila.ts';
import { createServiceClient } from './orgAuth.ts';
import { isParkingLinkableStatus } from './parkingPropertyLink.ts';
import { renderPropertyTemplateSendEmail } from './propertyTemplateEmail.ts';
import { resolveAppSettings } from './appSettings.ts';
import { formatResendFromAddress, loadPropertyEmailBranding } from './propertyEmailBranding.ts';
import { escapeHtml } from './renderEmailHtml.ts';

export function verifyParkingReminderCronSecret(req: Request): boolean {
  const expected = Deno.env.get('PARKING_REMINDER_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-parking-reminder-cron-secret')?.trim();
  return got === expected;
}

/** Send the one-time reminder this many days (or fewer) before check-in. */
const REMINDER_LEAD_DAYS = 3;

const REMINDER_BODY_TEMPLATE = `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333333;">Hi {{guest_name}}, your stay at <strong>{{unit_label}}</strong> starts on {{check_in_date}} — you mentioned you'd like paid parking.</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333333;">Reserve and pay for a spot separately through our parking marketplace: <a href="{{parking_url}}" style="color:#5c4428;font-weight:700;text-decoration:underline;">find parking near your stay</a>.</p>`;

type ReminderCandidateRow = {
  id: string;
  status: string;
  property_id: string;
  check_in_date: string;
  guest_email: string | null;
  guest_facebook_name: string | null;
  primary_guest_name: string | null;
};

async function loadUnlinkedCandidates(): Promise<ReminderCandidateRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('guest_submissions')
    .select(
      'id, status, property_id, check_in_date, guest_email, guest_facebook_name, primary_guest_name'
    )
    .not('property_id', 'is', null)
    .eq('need_parking', true)
    .is('parking_reminder_sent_at', null);

  if (error) {
    console.error('[parkingReminderCron] candidate query failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as ReminderCandidateRow[];
  const eligible = rows.filter((row) => isParkingLinkableStatus(row.status));
  if (eligible.length === 0) return [];

  const { data: linked } = await supabase
    .from('guest_submissions')
    .select('linked_property_booking_id')
    .in(
      'linked_property_booking_id',
      eligible.map((row) => row.id)
    )
    .not('linked_property_booking_id', 'is', null);
  const linkedIds = new Set((linked ?? []).map((row) => String(row.linked_property_booking_id)));

  const today = manilaTodayYmd();
  return eligible.filter((row) => {
    if (linkedIds.has(row.id)) return false;
    const checkInYmd = normalizeBookingDateToYmd(row.check_in_date);
    if (!checkInYmd) return false;
    const daysUntil = calendarDaysBetween(today, checkInYmd);
    return daysUntil >= 0 && daysUntil <= REMINDER_LEAD_DAYS;
  });
}

async function sendReminderEmail(row: ReminderCandidateRow): Promise<void> {
  const settings = await resolveAppSettings(row.property_id);
  const branding = await loadPropertyEmailBranding(row.property_id);
  const guestName = String(row.primary_guest_name ?? row.guest_facebook_name ?? 'Guest').trim();
  const guestEmail = String(row.guest_email ?? '').trim();
  if (!guestEmail) throw new Error('Booking has no guest email');

  const parkingUrl = `${settings.publicGuestAppOrigin.replace(/\/+$/, '')}/parkings`;

  const html = await renderPropertyTemplateSendEmail({
    propertyId: row.property_id,
    templateKey: 'email-booking-acknowledgement',
    emailTitle: 'Parking reminder',
    contentOverride: REMINDER_BODY_TEMPLATE,
    branding,
    placeholderVars: {
      guest_name: escapeHtml(guestName),
      unit_label: escapeHtml(branding.unitLabel),
      check_in_date: escapeHtml(row.check_in_date),
      parking_url: parkingUrl,
    },
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: formatResendFromAddress(branding.organizationName, branding.fromEmail),
      to: [guestEmail],
      reply_to: settings.emailReplyTo,
      subject: `${branding.organizationName} - Parking reminder for your upcoming stay`,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send parking reminder: ${JSON.stringify(err)}`);
  }

  const supabase = createServiceClient();
  await supabase
    .from('guest_submissions')
    .update({ parking_reminder_sent_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('parking_reminder_sent_at', null);
}

export async function runParkingReminderSweep(): Promise<{
  sent: number;
  failed: number;
}> {
  const candidates = await loadUnlinkedCandidates();
  let sent = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      await sendReminderEmail(row);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[parkingReminderCron] reminder failed for booking ${row.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { sent, failed };
}
