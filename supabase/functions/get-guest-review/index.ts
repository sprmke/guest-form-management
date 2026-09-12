/**
 * get-guest-review — Public read-only payload for Airbnb post-stay review (/guest-review).
 *
 * GET ?bookingId=<uuid>
 * Available for Airbnb bookings with security_deposit = 0 after check-out (Manila).
 */

import { authorizeGuestBookingAccess } from '../_shared/guestBookingAccessToken.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { loadAppSettingsRow, resolveAppSettings } from '../_shared/appSettings.ts';
import { canAccessGuestReview, resolveGuestReviewPath } from '../_shared/guestReviewEligibility.ts';
import { guestReviewExistsForBooking } from '../_shared/guestReviewService.ts';
import { resolveVoucherPrizes } from '../_shared/voucher.ts';
import { normalizeVoucherRevealStyle } from '../_shared/voucherRevealStyle.ts';
import { jsonError, jsonResponse, jsonSuccess } from '../_shared/httpResponse.ts';
import { servePublic } from '../_shared/serveEdge.ts';
import { publicGetRateLimitGate } from '../_shared/publicEndpointRateLimit.ts';

const NOT_FOUND = {
  success: false,
  error: 'not_found',
  message:
    'This review link is not available. Please contact your host if you think this is a mistake.',
};

servePublic('get-guest-review', async (req) => {
  if (req.method !== 'GET') {
    throw new Error(`Method ${req.method} not allowed`);
  }

  const limited = await publicGetRateLimitGate(req, 'get-guest-review', { maxPerMin: 30 });
  if (limited) return limited;

  const url = new URL(req.url);
  const bookingId = (url.searchParams.get('bookingId') ?? '').trim();
  if (!bookingId) {
    return jsonResponse(req, NOT_FOUND, 404);
  }

  const access = url.searchParams.get('access')?.trim() ?? null;
  const row = await DatabaseService.getBookingById(bookingId);
  const authz = await authorizeGuestBookingAccess({
    bookingIdFromPath: bookingId,
    accessTokenFromQuery: access,
    bookingCreatedAt: (row?.created_at as string | null | undefined) ?? null,
  });
  if (!authz.ok) {
    return jsonError(req, authz.message, authz.status);
  }

  if (!row) {
    return jsonResponse(req, NOT_FOUND, 404);
  }

  const reviewPath = resolveGuestReviewPath(row);
  if (reviewPath !== 'airbnb_post_stay' || !canAccessGuestReview(row)) {
    return jsonResponse(req, NOT_FOUND, 404);
  }

  const settings = await resolveAppSettings(
    (row.property_id as string | null | undefined) ?? undefined
  );
  const settingsRow = await loadAppSettingsRow(
    (row.property_id as string | null | undefined) ?? undefined
  );
  const vouchersEnabled = settingsRow?.vouchers_enabled !== false;
  const voucherPrizes = resolveVoucherPrizes(settingsRow?.voucher_prizes);
  const voucherRevealStyle = normalizeVoucherRevealStyle(settingsRow?.voucher_reveal_style);
  const guestReviewSubmitted = await guestReviewExistsForBooking(bookingId);

  return jsonSuccess(req, {
    bookingId: row.id,
    primary_guest_name: row.primary_guest_name ?? row.guest_facebook_name ?? '',
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    guest_review_submitted: guestReviewSubmitted,
    email_logo_url: settings.emailLogoUrl,
    brand_color: settings.brandColor,
    next_stay_voucher_code: row.next_stay_voucher_code ?? null,
    next_stay_voucher_amount:
      row.next_stay_voucher_amount != null ? Number(row.next_stay_voucher_amount) : null,
    review_path: reviewPath,
    vouchers_enabled: vouchersEnabled,
    voucher_prizes: voucherPrizes,
    voucher_reveal_style: voucherRevealStyle,
  });
});
