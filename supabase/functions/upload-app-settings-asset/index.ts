/**
 * upload-app-settings-asset — Admin upload for operator-level assets (GCash QR, GAF signature, review proof).
 * Auth: verifyAdminJwt. Writes public URL to app_settings when configured.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { handleEdgeError } from '../_shared/httpResponse.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { invalidateAppSettingsCache, loadAppSettingsRow } from '../_shared/appSettings.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import {
  applyExternalReviewAssetUpload,
  normalizeExternalReviewsDraft,
  type ExternalReviewAssetUploadType,
} from '../_shared/propertyExternalReviews.ts';
import { assertWithinUploadLimit } from '../_shared/uploadLimits.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'app-settings-assets';

type AssetConfig = {
  column?: string;
  storagePrefix: string;
  allowedMime?: Set<string>;
};

const ASSET_CONFIG = {
  gcash_qr: {
    column: 'gcash_qr_image_url',
    storagePrefix: 'gcash-qr',
  },
  gaf_unit_owner_signature: {
    column: 'gaf_unit_owner_signature_url',
    storagePrefix: 'gaf-unit-owner-signature',
    allowedMime: new Set(['image/jpeg', 'image/png']),
  },
  external_review_image: {
    storagePrefix: 'external-review',
  },
  external_review_stay_photo: {
    storagePrefix: 'external-review-stay',
  },
} as const satisfies Record<string, AssetConfig>;

type AssetType = keyof typeof ASSET_CONFIG;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function storagePathForAsset(
  assetType: AssetType,
  propertyId: string,
  ext: string,
  reviewId?: string,
  photoIndex?: number
): string {
  if (assetType === 'external_review_image') {
    if (!reviewId) throw new Error('reviewId is required for external_review_image');
    return `${ASSET_CONFIG.external_review_image.storagePrefix}/${propertyId}/${reviewId}${ext}`;
  }
  if (assetType === 'external_review_stay_photo') {
    if (!reviewId) throw new Error('reviewId is required for external_review_stay_photo');
    const idx = photoIndex ?? 0;
    if (idx < 0 || idx > 2) throw new Error('photoIndex must be 0, 1, or 2');
    return `${ASSET_CONFIG.external_review_stay_photo.storagePrefix}/${propertyId}/${reviewId}/${idx}${ext}`;
  }
  // Payment QR: unique object path so staging uploads do not overwrite the live QR before OTP save.
  if (assetType === 'gcash_qr') {
    return `${ASSET_CONFIG.gcash_qr.storagePrefix}/${propertyId}/${crypto.randomUUID()}${ext}`;
  }
  return `${ASSET_CONFIG[assetType].storagePrefix}/${propertyId}/current${ext}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const assetType = formData.get('assetType') as AssetType;
    if (!assetType || !ASSET_CONFIG[assetType]) {
      throw new Error(`Invalid assetType: "${assetType}"`);
    }

    const permission =
      assetType === 'gcash_qr'
        ? ('settings.payment:edit' as const)
        : assetType === 'gaf_unit_owner_signature'
          ? ('settings.buildingForms:edit' as const)
          : ('settings.socials:edit' as const);

    const { property } = await resolveScopedPropertyAccess(req, permission);
    const propertyId = property.id;

    const file = formData.get('file') as File;
    const fileName = (formData.get('fileName') as string) || file?.name;
    const reviewId = (formData.get('reviewId') as string | null)?.trim() || undefined;
    const photoIndexRaw = formData.get('photoIndex');
    const photoIndex =
      photoIndexRaw == null || photoIndexRaw === '' ? undefined : Number(photoIndexRaw);

    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const mime = (file.type || '').toLowerCase();
    const allowedMime = ASSET_CONFIG[assetType].allowedMime ?? ALLOWED_MIME;
    if (!allowedMime.has(mime)) {
      throw new Error(
        assetType === 'gaf_unit_owner_signature'
          ? 'Signature must be PNG or JPEG'
          : 'File must be JPEG, PNG, or WebP'
      );
    }
    assertWithinUploadLimit(file, 'image');

    const ext = fileName.includes('.')
      ? `.${fileName.split('.').pop()?.toLowerCase()}`
      : mime === 'image/png'
        ? '.png'
        : mime === 'image/webp'
          ? '.webp'
          : '.jpg';
    const storagePath = storagePathForAsset(assetType, propertyId, ext, reviewId, photoIndex);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: mime });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const safePublicUrl = formatPublicUrl(publicUrl);
    const persistedUrl =
      assetType === 'gaf_unit_owner_signature'
        ? `${safePublicUrl}${safePublicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
        : safePublicUrl;

    const config = ASSET_CONFIG[assetType];
    // Payment QR is staging-only here — `app_settings` / payment_methods update on OTP-gated PATCH.
    const persistColumn = config.column && assetType !== 'gcash_qr';
    if (persistColumn && config.column) {
      const patch: Record<string, string> = {
        [config.column]: persistedUrl,
      };
      await DatabaseService.updateAppSettings(patch, propertyId);
      invalidateAppSettingsCache(propertyId);
    } else if (
      assetType === 'external_review_image' ||
      assetType === 'external_review_stay_photo'
    ) {
      const currentRow = await loadAppSettingsRow(propertyId);
      const existing = normalizeExternalReviewsDraft(currentRow?.external_reviews);
      const nextReviews = applyExternalReviewAssetUpload(
        existing,
        reviewId ?? '',
        assetType as ExternalReviewAssetUploadType,
        safePublicUrl,
        photoIndex
      );
      if (nextReviews) {
        await DatabaseService.updateAppSettings({ external_reviews: nextReviews }, propertyId);
        invalidateAppSettingsCache(propertyId);
      }
    }

    console.log(`[upload-app-settings-asset] Uploaded ${assetType}: ${persistedUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: persistedUrl,
          bucket: BUCKET,
          path: storagePath,
          column: persistColumn ? (config.column ?? null) : null,
        },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return await handleEdgeError(req, error, '[upload-app-settings-asset]');
  }
});
