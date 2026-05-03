/**
 * sd-refund-cron — Phase 4 scheduled edge function.
 *
 * Purpose:  Scan for bookings in `READY_FOR_CHECKIN` status where the guest's
 *           check-out datetime has passed by at least 15 minutes (Asia/Manila),
 *           and auto-transition them to `READY_FOR_CHECKOUT` (guest SD form + email)
 *           only when balance settlement is already recorded (paid amount = total guest balance + receipt URL).
 *
 * Trigger:  Supabase cron — every 5 minutes (POST with empty or `{}` body — processes all candidates).
 *
 * Scoped admin runs:
 *   POST JSON `{ "bookingId": "<uuid>" }` with a valid **admin** JWT (`verifyAdminJwt`).
 *   Only that booking is evaluated (same due + settlement rules). Prevents one admin click
 *   from transitioning unrelated `READY_FOR_CHECKIN` rows.
 *
 * Email guard (all runs):
 *   If check-out is older than `SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS` (default 21; set `0` to disable),
 *   the transition still runs (status / calendar / sheet) but **`sendSdRefundFormEmail` is false** so guests
 *   who checked out long ago are not emailed the `/sd-form` link from automation.
 *
 * Idempotency:
 *   - The status machine (`canTransition`) prevents re-processing: a booking
 *     already moved to PENDING_SD_REFUND cannot move back.
 *   - Safe to run multiple times; re-entrant — only READY_FOR_CHECKIN rows are touched.
 *
 * Timezone:  Asia/Manila (UTC+8) for all wall-clock comparisons (Q7.1).
 *
 * Grace period:  15 minutes after check_out_date + check_out_time (env: SD_REFUND_CRON_GRACE_MINUTES, default 15).
 *
 * Reference:  docs/NEW_FLOW_PLAN.md §5 Phase 4, §6.1 Q7.1
 *             .cursor/rules/booking-workflow.mdc §3
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import { computeTotalGuestBalanceFromBooking } from '../_shared/totalGuestBalance.ts';

const MANILA_TZ = 'Asia/Manila';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Date/time helpers ─────────────────────────────────────────────────────────

/**
 * Returns current wall-clock time in Asia/Manila as a Date object.
 */
function nowManila(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: MANILA_TZ }));
}

/**
 * Parse a booking's check-out date + time into a Date in Asia/Manila.
 *
 * check_out_date is stored as MM-DD-YYYY text.
 * check_out_time is stored as HH:MM AM/PM (e.g. "11:00 AM") or 24h (e.g. "11:00").
 *
 * Returns a Date whose numeric value matches Asia/Manila wall-clock time.
 */
function parseCheckoutManila(checkOutDate: string, checkOutTime: string): Date | null {
  try {
    // Normalize MM-DD-YYYY → YYYY-MM-DD
    let isoDate: string;
    if (/^\d{2}-\d{2}-\d{4}$/.test(checkOutDate)) {
      const [m, d, y] = checkOutDate.split('-');
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate)) {
      isoDate = checkOutDate;
    } else {
      return null;
    }

    // Normalize time → 24h HH:MM
    let hour24 = 0;
    let minute = 0;

    const ampm = checkOutTime?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = parseInt(ampm[2], 10);
      const period = ampm[3].toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      hour24 = h;
      minute = m;
    } else {
      const plain = checkOutTime?.match(/(\d{1,2}):(\d{2})/);
      if (plain) {
        hour24 = parseInt(plain[1], 10);
        minute = parseInt(plain[2], 10);
      }
    }

    // Build local Manila datetime string and parse via toLocaleString trick
    const localStr = `${isoDate}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

    // Parse as if it were UTC, then adjust for Manila offset (+8h)
    // Instead, use Intl to get the Manila-aware date
    const utc = new Date(`${localStr}+08:00`);
    return utc;
  } catch {
    return null;
  }
}

/**
 * Returns the default check-out time fallback (11:00 AM Manila).
 */
function defaultCheckoutTime(): string {
  return '11:00 AM';
}

/** Same rules as WorkflowOrchestrator for RFCI → READY_FOR_CHECKOUT payload (paid = total). */
function canAutoTransitionWithSettlement(row: Record<string, unknown>): {
  ok: true;
} | { ok: false; reason: string } {
  const totalDue = computeTotalGuestBalanceFromBooking(row);
  if (totalDue === null) {
    return { ok: false, reason: 'missing_total_guest_balance' };
  }

  const paidRaw = row.guest_balance_paid_amount;
  if (paidRaw === null || paidRaw === undefined || paidRaw === '') {
    return { ok: false, reason: 'missing_guest_balance_paid_amount' };
  }
  const paidNum = Number(paidRaw);
  if (Number.isNaN(paidNum) || paidNum < 0) {
    return { ok: false, reason: 'invalid_guest_balance_paid_amount' };
  }
  const balCents = Math.round(totalDue * 100);
  const paidCents = Math.round(paidNum * 100);
  if (paidCents > balCents) {
    return { ok: false, reason: 'guest_balance_paid_exceeds_balance' };
  }
  if (paidCents !== balCents) {
    return { ok: false, reason: 'guest_balance_not_fully_paid' };
  }

  const receipt =
    typeof row.guest_balance_payment_receipt_url === 'string'
      ? row.guest_balance_payment_receipt_url.trim()
      : '';
  if (!receipt) {
    return { ok: false, reason: 'missing_guest_balance_payment_receipt' };
  }

  return { ok: true };
}

// ─── DB helper ─────────────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

const SELECT_COLUMNS =
  'id, check_in_date, check_out_date, check_out_time, is_test_booking, guest_facebook_name, booking_rate, down_payment, security_deposit, pet_fee, parking_rate_guest, guest_additional_fee, guest_balance_paid_amount, guest_balance_payment_receipt_url';

type CronResultRow = {
  bookingId: string;
  action: string;
  reason?: string;
  sdRefundFormEmailSent?: boolean;
};

async function parseOptionalBookingId(req: Request): Promise<string | undefined> {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined;
  try {
    const body = (await req.json()) as { bookingId?: unknown };
    if (typeof body?.bookingId === 'string' && body.bookingId.trim()) {
      return body.bookingId.trim();
    }
  } catch {
    // empty body
  }
  return undefined;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  const runStarted = new Date().toISOString();
  console.log('[sd-refund-cron] Run started at', runStarted);

  try {
    const graceMinutes = parseInt(Deno.env.get('SD_REFUND_CRON_GRACE_MINUTES') ?? '15', 10);
    const maxCheckoutAgeDays = parseInt(
      Deno.env.get('SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS') ?? '21',
      10,
    );
    const nowMs = nowManila().getTime();

    console.log(`[sd-refund-cron] Now (Manila): ${nowManila().toISOString()}, grace: ${graceMinutes}min`);
    console.log(
      `[sd-refund-cron] Max checkout age for SD form email: ${
        maxCheckoutAgeDays <= 0 ? 'disabled (always allow email when transitioning)' : `${maxCheckoutAgeDays} day(s)`
      }`,
    );

    const scopedBookingId = await parseOptionalBookingId(req);
    let scoped = false;

    if (scopedBookingId) {
      if (!UUID_RE.test(scopedBookingId)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid bookingId (expected UUID)' }),
          { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
      await verifyAdminJwt(req);
      scoped = true;
      console.log(`[sd-refund-cron] Scoped run for bookingId=${scopedBookingId}`);
    }

    const admin = supabaseAdmin();
    let query = admin
      .from('guest_submissions')
      .select(SELECT_COLUMNS)
      .eq('status', 'READY_FOR_CHECKIN');

    if (scopedBookingId) {
      query = query.eq('id', scopedBookingId);
    }

    const { data: candidates, error } = await query;

    if (error) {
      throw new Error(`DB fetch failed: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      const msg = scopedBookingId
        ? `[sd-refund-cron] No READY_FOR_CHECKIN booking for id=${scopedBookingId}.`
        : '[sd-refund-cron] No READY_FOR_CHECKIN bookings. Nothing to do.';
      console.log(msg);
      return new Response(
        JSON.stringify({
          success: true,
          scoped,
          scanned: 0,
          transitioned: 0,
          skipped: scopedBookingId ? 1 : 0,
          results: scopedBookingId
            ? [{
              bookingId: scopedBookingId,
              action: 'skipped',
              reason: 'not_found_or_not_ready_for_checkin',
            } satisfies CronResultRow]
            : [],
        }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.log(
      `[sd-refund-cron] Scanning ${candidates.length} READY_FOR_CHECKIN booking(s)${scoped ? ' (scoped)' : ''}`,
    );

    let transitioned = 0;
    let skipped = 0;
    const results: CronResultRow[] = [];

    const maxAgeMs =
      maxCheckoutAgeDays > 0 ? maxCheckoutAgeDays * 24 * 60 * 60 * 1000 : Number.POSITIVE_INFINITY;

    for (const booking of candidates) {
      const bookingId = booking.id as string;
      const checkOutDate = (booking.check_out_date as string) ?? '';
      const checkOutTime = (booking.check_out_time as string) || defaultCheckoutTime();

      const checkoutDt = parseCheckoutManila(checkOutDate, checkOutTime);

      if (!checkoutDt) {
        console.warn(`[sd-refund-cron] Cannot parse checkout datetime for booking ${bookingId}: date="${checkOutDate}" time="${checkOutTime}"`);
        results.push({ bookingId, action: 'skipped', reason: 'unparseable_checkout_datetime' });
        skipped++;
        continue;
      }

      const checkoutWithGraceMs = checkoutDt.getTime() + graceMinutes * 60 * 1000;
      const isOverdue = nowMs >= checkoutWithGraceMs;

      if (!isOverdue) {
        const minutesRemaining = Math.round((checkoutWithGraceMs - nowMs) / 60000);
        console.log(
          `[sd-refund-cron] Booking ${bookingId} (${booking.guest_facebook_name}) not yet due ` +
            `(${minutesRemaining} min remaining after grace period)`,
        );
        results.push({ bookingId, action: 'skipped', reason: `not_yet_due_${minutesRemaining}min` });
        skipped++;
        continue;
      }

      const settlement = canAutoTransitionWithSettlement(booking);
      if (!settlement.ok) {
        console.log(
          `[sd-refund-cron] Booking ${bookingId} checkout due but skipping auto-transition: ${settlement.reason}`,
        );
        results.push({ bookingId, action: 'skipped', reason: settlement.reason });
        skipped++;
        continue;
      }

      const checkoutAgeMs = nowMs - checkoutDt.getTime();
      const suppressSdFormEmail = checkoutAgeMs > maxAgeMs;
      if (suppressSdFormEmail) {
        console.log(
          `[sd-refund-cron] Booking ${bookingId}: check-out older than ${maxCheckoutAgeDays}d — ` +
            'transitioning without SD refund form email',
        );
      }

      console.log(
        `[sd-refund-cron] Transitioning booking ${bookingId} (${booking.guest_facebook_name}) ` +
          `checkout ${checkOutDate} ${checkOutTime} → READY_FOR_CHECKOUT` +
          (suppressSdFormEmail ? ' (no SD form email)' : ''),
      );

      try {
        await WorkflowOrchestrator.transition(
          bookingId,
          'READY_FOR_CHECKOUT',
          {
            guest_balance_paid_amount: Number(booking.guest_balance_paid_amount),
            guest_balance_payment_receipt_url:
              String(booking.guest_balance_payment_receipt_url ?? '').trim(),
          },
          {
            saveToDatabase: true,
            generatePdf: false,
            updateGoogleCalendar: true,
            updateGoogleSheets: true,
            sendGafRequestEmail: false,
            sendParkingBroadcastEmail: false,
            sendPetRequestEmail: false,
            sendBookingAcknowledgementEmail: false,
            sendReadyForCheckinEmail: false,
            sendSdRefundFormEmail: !suppressSdFormEmail,
          },
          false, // manual=false — cron-driven transition
        );

        console.log(`[sd-refund-cron] Transitioned booking ${bookingId} → READY_FOR_CHECKOUT`);
        results.push({
          bookingId,
          action: 'transitioned',
          sdRefundFormEmailSent: !suppressSdFormEmail,
        });
        transitioned++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[sd-refund-cron] Failed to transition booking ${bookingId}:`, msg);
        results.push({ bookingId, action: 'failed', reason: msg });
        // Don't re-throw — continue processing remaining bookings
      }
    }

    const emailSentCount = results.filter((r) =>
      r.action === 'transitioned' && r.sdRefundFormEmailSent === true
    ).length;
    const emailSuppressedCount = results.filter((r) =>
      r.action === 'transitioned' && r.sdRefundFormEmailSent === false
    ).length;

    const summary = {
      success: true,
      scoped,
      scanned: candidates.length,
      transitioned,
      skipped,
      transitionedSdEmailSent: emailSentCount,
      transitionedSdEmailSuppressed: emailSuppressedCount,
      results,
    };

    console.log('[sd-refund-cron] Run complete:', JSON.stringify({ scanned: candidates.length, transitioned, skipped }));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('[sd-refund-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
