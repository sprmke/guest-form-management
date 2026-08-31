/**
 * claim-sd-voucher — Public POST that idempotently awards a next-stay voucher.
 *
 * Called when the guest taps "Claim it!" after submitting an in-app review.
 * The handler ignores any client `code` and rolls server-side from the
 * property's `voucher_prizes` (or platform defaults). If a voucher is already
 * on the booking, that one is returned instead of rolling again.
 *
 * Requires an existing guest review. Status guard: `canClaimGuestReviewVoucher`.
 * Disabled when `app_settings.vouchers_enabled` is false (unless already awarded).
 */

import { DatabaseService } from '../_shared/databaseService.ts';
import { loadAppSettingsRow } from '../_shared/appSettings.ts';
import { canClaimGuestReviewVoucher } from '../_shared/guestReviewEligibility.ts';
import { guestReviewExistsForBooking } from '../_shared/guestReviewService.ts';
import { createServiceClient, tryGetAuthenticatedUser } from '../_shared/orgAuth.ts';
import { rollVoucher } from '../_shared/voucher.ts';
import {
  jsonResponse,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';

servePublic('claim-sd-voucher', async (req) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);
  const bookingId = (typeof body.bookingId === 'string' ? body.bookingId : '').trim();
  if (!bookingId) throw new Error('bookingId is required');

  const guestUser = await tryGetAuthenticatedUser(req);
  const row = await DatabaseService.getBookingById(bookingId);
  if (!row || !canClaimGuestReviewVoucher(row)) {
    return jsonResponse(
      req,
      {
        success: false,
        error: 'not_available',
        message: 'This form is no longer available for this booking.',
      },
      409
    );
  }

  let code = (row.next_stay_voucher_code ?? null) as string | null;
  let amount = row.next_stay_voucher_amount != null ? Number(row.next_stay_voucher_amount) : null;
  const alreadyAwarded = !!code;

  if (alreadyAwarded && guestUser?.id && !row.guest_user_id) {
    await createServiceClient()
      .from('guest_submissions')
      .update({ guest_user_id: guestUser.id, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .is('guest_user_id', null);
  }

  if (!code) {
    const hasReview = await guestReviewExistsForBooking(bookingId);
    if (!hasReview) {
      return jsonResponse(
        req,
        {
          success: false,
          error: 'review_required',
          message: 'Submit a review before claiming a voucher.',
        },
        409
      );
    }

    const settingsRow = await loadAppSettingsRow(
      (row.property_id as string | null | undefined) ?? undefined
    );
    if (settingsRow?.vouchers_enabled === false) {
      return jsonResponse(
        req,
        {
          success: false,
          error: 'not_available',
          message: 'Vouchers are not available for this property.',
        },
        409
      );
    }
    const rolled = rollVoucher(settingsRow?.voucher_prizes);
    code = rolled.code;
    amount = rolled.amount;
    const awardedAt = new Date().toISOString();
    const awardPatch: Record<string, unknown> = {
      next_stay_voucher_code: code,
      next_stay_voucher_amount: amount,
      next_stay_voucher_awarded_at: awardedAt,
      updated_at: awardedAt,
    };
    // Stamp wallet ownership when the guest is signed in at claim time.
    if (guestUser?.id && !row.guest_user_id) {
      awardPatch.guest_user_id = guestUser.id;
    }

    // Conditional write — only first claim wins if two requests race.
    const { data: claimed, error } = await createServiceClient()
      .from('guest_submissions')
      .update(awardPatch)
      .eq('id', bookingId)
      .is('next_stay_voucher_code', null)
      .select('next_stay_voucher_code, next_stay_voucher_amount')
      .maybeSingle();

    if (error) throw new Error(`Failed to award voucher: ${error.message}`);

    if (!claimed) {
      const refreshed = await DatabaseService.getBookingById(bookingId);
      code = (refreshed?.next_stay_voucher_code ?? null) as string | null;
      amount =
        refreshed?.next_stay_voucher_amount != null
          ? Number(refreshed.next_stay_voucher_amount)
          : null;
      if (!code) {
        return jsonResponse(
          req,
          {
            success: false,
            error: 'not_available',
            message: 'Could not award voucher. Please try again.',
          },
          409
        );
      }
      return jsonSuccess(req, { code, amount, alreadyAwarded: true });
    }

    code = String(claimed.next_stay_voucher_code);
    amount =
      claimed.next_stay_voucher_amount != null ? Number(claimed.next_stay_voucher_amount) : amount;
    return jsonSuccess(req, { code, amount, alreadyAwarded: false });
  }

  return jsonSuccess(req, { code, amount, alreadyAwarded });
});
