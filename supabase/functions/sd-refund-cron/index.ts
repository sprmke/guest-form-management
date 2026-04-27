/**
 * sd-refund-cron — Phase 4 scheduled edge function.
 *
 * Purpose:  Scan for bookings in `READY_FOR_CHECKIN` status where the guest's
 *           check-out datetime has passed by at least 15 minutes (Asia/Manila),
 *           and auto-transition them to `PENDING_SD_REFUND`.
 *
 * Trigger:  Supabase cron — every 5 minutes.
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
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';

const MANILA_TZ = 'Asia/Manila';

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

// ─── DB helper ─────────────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
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
    const nowMs = nowManila().getTime();

    console.log(`[sd-refund-cron] Now (Manila): ${nowManila().toISOString()}, grace: ${graceMinutes}min`);

    // Fetch all READY_FOR_CHECKIN bookings
    const { data: candidates, error } = await supabaseAdmin()
      .from('guest_submissions')
      .select('id, check_in_date, check_out_date, check_out_time, is_test_booking, guest_facebook_name')
      .eq('status', 'READY_FOR_CHECKIN');

    if (error) {
      throw new Error(`DB fetch failed: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('[sd-refund-cron] No READY_FOR_CHECKIN bookings. Nothing to do.');
      return new Response(
        JSON.stringify({ success: true, scanned: 0, transitioned: 0, skipped: 0 }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[sd-refund-cron] Scanning ${candidates.length} READY_FOR_CHECKIN booking(s)`);

    let transitioned = 0;
    let skipped = 0;
    const results: Array<{ bookingId: string; action: string; reason?: string }> = [];

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

      console.log(
        `[sd-refund-cron] Transitioning booking ${bookingId} (${booking.guest_facebook_name}) ` +
        `checkout ${checkOutDate} ${checkOutTime} → PENDING_SD_REFUND`,
      );

      try {
        await WorkflowOrchestrator.transition(
          bookingId,
          'PENDING_SD_REFUND',
          {},
          {
            saveToDatabase: true,
            updateGoogleCalendar: true,
            updateGoogleSheets: true,
            // No emails on this auto-transition per side-effect matrix
            sendGafRequestEmail: false,
            sendParkingBroadcastEmail: false,
            sendPetRequestEmail: false,
            sendBookingAcknowledgementEmail: false,
            sendReadyForCheckinEmail: false,
          },
          false, // manual=false — cron-driven transition
        );

        console.log(`[sd-refund-cron] Transitioned booking ${bookingId} → PENDING_SD_REFUND`);
        results.push({ bookingId, action: 'transitioned' });
        transitioned++;
      } catch (e: any) {
        console.error(`[sd-refund-cron] Failed to transition booking ${bookingId}:`, e.message);
        results.push({ bookingId, action: 'failed', reason: e.message });
        // Don't re-throw — continue processing remaining bookings
      }
    }

    const summary = {
      success: true,
      scanned: candidates.length,
      transitioned,
      skipped,
      results,
    };

    console.log('[sd-refund-cron] Run complete:', JSON.stringify({ scanned: candidates.length, transitioned, skipped }));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[sd-refund-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
