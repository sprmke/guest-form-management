/**
 * upload-booking-asset — Admin endpoint to upload supporting assets (parking
 * endorsements, manually-obtained approved GAF PDFs, etc.) to Supabase Storage.
 *
 * Expects multipart/form-data with:
 *   bookingId   — string (UUID)
 *   assetType   — 'parking_endorsement' | 'approved_gaf' | 'approved_pet' | 'sd_refund_receipt'
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

const ASSET_CONFIG = {
  // ── Workflow assets (set during transitions) ──────────────────────────────
  parking_endorsement: {
    bucket: 'parking-endorsements',
    column: 'parking_endorsement_url',
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

    // Write the URL to the DB column
    await DatabaseService.setWorkflowFields(bookingId, { [config.column]: publicUrl });

    console.log(`[upload-booking-asset] Uploaded ${assetType} for ${bookingId}: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: publicUrl,
          bucket: config.bucket,
          path: storagePath,
          column: config.column,
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
