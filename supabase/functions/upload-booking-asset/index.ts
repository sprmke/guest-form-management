/**
 * upload-booking-asset — Admin endpoint to upload supporting assets (parking
 * endorsements, manually-obtained approved GAF PDFs, etc.) to Supabase Storage.
 *
 * Expects multipart/form-data with:
 *   bookingId   — string (UUID)
 *   assetType   — 'parking_endorsement' | 'parking_payment_receipt' | 'approved_gaf' | 'approved_pet' | 'sd_refund_receipt'
 *                 | 'guest_balance_payment_receipt'
 *   file        — the file to upload
 *   fileName    — original filename
 *
 * On success, writes the storage URL into the appropriate DB column and returns it.
 *
 * Trigger:  POST /functions/v1/upload-booking-asset
 * Auth:     verify_jwt = true (admin only)
 * Plan:     docs/NEW_FLOW_PLAN.md §3.3, §6.1 Q4.4
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import {
  pendingDocumentsClearPatchForGuestEditRevert,
  shouldRevertGuestFieldEditsToPendingReview,
} from '../_shared/statusMachine.ts';
import { formatPublicUrl } from '../_shared/utils.ts';
import {
  dbPatchForReceiptValidation,
  type ReceiptValidationResult,
  validateReceiptFile,
} from '../_shared/receiptValidationService.ts';
import { notifyTelegramAdminBalanceReceiptUploaded } from '../_shared/telegramAdmin.ts';

const PAYMENT_RECEIPT_ASSET_TYPES = new Set([
  'payment_receipt',
  'guest_balance_payment_receipt',
]);

const ASSET_CONFIG = {
  // ── Workflow assets (set during transitions) ──────────────────────────────
  parking_endorsement: {
    bucket: 'parking-endorsements',
    column: 'parking_endorsement_url',
  },
  parking_payment_receipt: {
    bucket: 'payment-receipts',
    column: 'parking_payment_receipt_url',
  },
  approved_gaf: {
    bucket: 'approved-gafs',
    column: 'approved_gaf_pdf_url',
  },
  approved_pet: {
    bucket: 'approved-pet-forms',
    column: 'approved_pet_pdf_url',
  },
  sd_refund_receipt: {
    bucket: 'sd-refund-receipts',
    column: 'sd_refund_receipt_url',
  },
  guest_balance_payment_receipt: {
    bucket: 'sd-refund-receipts',
    column: 'guest_balance_payment_receipt_url',
  },
  // ── Guest documents (replaceable by admin from the booking edit form) ─────
  valid_id: {
    bucket: 'valid-ids',
    column: 'valid_id_url',
  },
  payment_receipt: {
    bucket: 'payment-receipts',
    column: 'payment_receipt_url',
  },
  pet_vaccination: {
    bucket: 'pet-vaccinations',
    column: 'pet_vaccination_url',
  },
  pet_image: {
    bucket: 'pet-images',
    column: 'pet_image_url',
  },
} as const;

type AssetType = keyof typeof ASSET_CONFIG;

function isGuestDocRevertAssetType(t: AssetType): boolean {
  return (
    t === 'payment_receipt' ||
    t === 'valid_id' ||
    t === 'pet_vaccination' ||
    t === 'pet_image'
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const bookingId = formData.get('bookingId') as string;
    const assetType = formData.get('assetType') as AssetType;
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || file?.name;

    if (!bookingId) throw new Error('bookingId is required');
    if (!assetType || !ASSET_CONFIG[assetType]) throw new Error(`Invalid assetType: "${assetType}"`);
    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const config = ASSET_CONFIG[assetType];
    const storagePath = `${bookingId}/${fileName}`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(config.bucket)
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(storagePath);
    const safePublicUrl = formatPublicUrl(publicUrl);

    const booking = await DatabaseService.getBookingById(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const workflowUpdate: Record<string, unknown> = {
      [config.column]: safePublicUrl,
    };

    let receiptValidation: ReceiptValidationResult | undefined;
    if (PAYMENT_RECEIPT_ASSET_TYPES.has(assetType)) {
      try {
        receiptValidation = await validateReceiptFile(file);
        const kind = assetType === 'payment_receipt' ? 'downpayment' : 'balance';
        Object.assign(
          workflowUpdate,
          dbPatchForReceiptValidation(kind, receiptValidation),
        );
        console.log(
          `[upload-booking-asset] ${assetType} AI: ${receiptValidation.verdict} — ${receiptValidation.summary}`,
        );
      } catch (aiErr) {
        console.error('[upload-booking-asset] Receipt AI validation failed (non-fatal):', aiErr);
      }
    }

    if (
      shouldRevertGuestFieldEditsToPendingReview(booking.status) &&
      isGuestDocRevertAssetType(assetType)
    ) {
      Object.assign(workflowUpdate, pendingDocumentsClearPatchForGuestEditRevert());
      workflowUpdate.status = 'PENDING_REVIEW';
      workflowUpdate.status_updated_at = new Date().toISOString();
      console.log(
        `[upload-booking-asset] ${assetType} replaced while ${booking.status} → PENDING_REVIEW`,
      );
    }
    await DatabaseService.setWorkflowFields(bookingId, workflowUpdate);

    if (assetType === 'guest_balance_payment_receipt') {
      try {
        const refreshed = await DatabaseService.getBookingById(bookingId);
        if (refreshed) {
          await notifyTelegramAdminBalanceReceiptUploaded(
            refreshed as Record<string, unknown>,
          );
        }
      } catch (tgErr) {
        console.error('[upload-booking-asset] Telegram balance receipt notify failed (non-fatal):', tgErr);
      }
    }

    console.log(`[upload-booking-asset] Uploaded ${assetType} for ${bookingId}: ${safePublicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: safePublicUrl,
          bucket: config.bucket,
          path: storagePath,
          column: config.column,
          receiptValidation: receiptValidation ?? null,
        },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in upload-booking-asset:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: any) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
