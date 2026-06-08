/**
 * app-settings — Admin GET/PATCH for operator config (app_settings table).
 * Auth: verifyAdminJwt. Secrets remain in Edge env only.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  invalidateAppSettingsCache,
  serializeAppSettingsForAdmin,
  validateEmailList,
  validateOptionalEmail,
  validateOptionalOrigin,
  validateOptionalUrl,
  validateGcashName,
  validateGcashNumber,
  formatGcashNumberDisplay,
} from '../_shared/appSettings.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method === 'GET') {
      const data = await serializeAppSettingsForAdmin();
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = {};

      if (typeof body.emailTo === 'string') {
        const err = validateOptionalEmail(body.emailTo, 'Email To');
        if (err) {
          return jsonError(req, 400, err);
        }
        patch.email_to = body.emailTo.trim() || null;
      }
      if (typeof body.emailReplyTo === 'string') {
        const err = validateOptionalEmail(body.emailReplyTo, 'Email Reply-To');
        if (err) {
          return jsonError(req, 400, err);
        }
        patch.email_reply_to = body.emailReplyTo.trim() || null;
      }
      if (typeof body.parkingOwnerEmails === 'string') {
        const trimmed = body.parkingOwnerEmails.trim();
        if (trimmed) {
          const err = validateEmailList(trimmed, 'parking owner');
          if (err) return jsonError(req, 400, err);
          patch.parking_owner_emails = trimmed;
        } else {
          patch.parking_owner_emails = null;
        }
      }
      if (typeof body.sdRefundCronEmailLeadHours === 'number') {
        const minutes = Math.round(body.sdRefundCronEmailLeadHours * 60);
        if (
          !Number.isFinite(minutes) ||
          minutes < 0 ||
          minutes > 10080
        ) {
          return jsonError(req, 400, 'SD refund email lead must be 0–168 hours');
        }
        patch.sd_refund_cron_email_lead_minutes = minutes;
      } else if (typeof body.sdRefundCronEmailLeadMinutes === 'number') {
        const n = Math.floor(body.sdRefundCronEmailLeadMinutes);
        if (n < 0 || n > 10080) {
          return jsonError(req, 400, 'SD refund email lead must be 0–10080 minutes');
        }
        patch.sd_refund_cron_email_lead_minutes = n;
      }
      if (typeof body.sdRefundCronMaxCheckoutAgeDays === 'number') {
        const n = Math.floor(body.sdRefundCronMaxCheckoutAgeDays);
        if (n < 0 || n > 365) {
          return jsonError(req, 400, 'Max checkout age must be 0–365 days');
        }
        patch.sd_refund_cron_max_checkout_age_days = n;
      }
      if (typeof body.publicGuestAppOrigin === 'string') {
        const trimmed = body.publicGuestAppOrigin.trim();
        if (trimmed) {
          const err = validateOptionalOrigin(trimmed);
          if (err) return jsonError(req, 400, err);
          patch.public_guest_app_origin = trimmed.replace(/\/+$/, '');
        } else {
          patch.public_guest_app_origin = null;
        }
      }
      if (typeof body.facebookReviewsUrl === 'string') {
        const trimmed = body.facebookReviewsUrl.trim();
        if (trimmed) {
          const err = validateOptionalUrl(trimmed, 'Facebook reviews URL');
          if (err) return jsonError(req, 400, err);
          patch.facebook_reviews_url = trimmed;
        } else {
          patch.facebook_reviews_url = null;
        }
      }
      if (typeof body.emailLogoUrl === 'string') {
        const trimmed = body.emailLogoUrl.trim();
        if (trimmed) {
          return jsonError(
            req,
            400,
            'Team logo can only be updated via upload-app-settings-asset',
          );
        }
        patch.email_logo_url = null;
      }
      if (typeof body.defaultParkingRateGuest === 'number') {
        const n = body.defaultParkingRateGuest;
        if (!Number.isFinite(n) || n <= 0) {
          return jsonError(req, 400, 'Default parking rate must be greater than 0');
        }
        patch.default_parking_rate_guest = Math.round(n * 100) / 100;
      }
      if (typeof body.gcashName === 'string') {
        const trimmed = body.gcashName.trim();
        if (trimmed) {
          const err = validateGcashName(trimmed);
          if (err) return jsonError(req, 400, err);
          patch.gcash_name = trimmed;
        } else {
          patch.gcash_name = null;
        }
      }
      if (typeof body.gcashNumber === 'string') {
        const trimmed = body.gcashNumber.trim();
        if (trimmed) {
          const err = validateGcashNumber(trimmed);
          if (err) return jsonError(req, 400, err);
          patch.gcash_number = formatGcashNumberDisplay(trimmed);
        } else {
          patch.gcash_number = null;
        }
      }
      if (typeof body.gcashQrImageUrl === 'string') {
        const trimmed = body.gcashQrImageUrl.trim();
        if (trimmed) {
          return jsonError(
            req,
            400,
            'GCash QR image can only be updated via upload-app-settings-asset',
          );
        }
        patch.gcash_qr_image_url = null;
      }

      if (Object.keys(patch).length === 0) {
        return jsonError(req, 400, 'No valid fields to update');
      }

      await DatabaseService.updateAppSettings(patch);
      invalidateAppSettingsCache();
      const data = await serializeAppSettingsForAdmin();

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    return jsonError(req, 405, `Method ${req.method} not allowed`);
  } catch (error) {
    console.error('[app-settings]', error);
    const status = error instanceof Response ? error.status : 400;
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});

function jsonError(req: Request, status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
