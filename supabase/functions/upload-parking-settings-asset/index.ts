/**
 * upload-parking-settings-asset — Admin upload for parking operator assets (GCash QR).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import { resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { ensureParkingSettings } from '../_shared/parkingSettingsSeed.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'app-settings-assets';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

type AssetType = 'gcash_qr';

const ASSET_CONFIG: Record<AssetType, { column: string; storagePrefix: string }> = {
  gcash_qr: {
    column: 'gcash_qr_image_url',
    storagePrefix: 'parking-gcash-qr',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const { parkingRow } = await resolveScopedParkingAccess(req, 'org:parkings:manage');
    const parkingId = parkingRow.id;

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const assetType = formData.get('assetType') as AssetType;
    const file = formData.get('file') as File;
    const fileName = (formData.get('fileName') as string) || file?.name;

    if (!assetType || !ASSET_CONFIG[assetType]) {
      throw new Error(`Invalid assetType: "${assetType}"`);
    }
    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error('File must be JPEG, PNG, or WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File must be 5 MB or smaller');
    }

    const ext = fileName.includes('.')
      ? `.${fileName.split('.').pop()?.toLowerCase()}`
      : mime === 'image/png'
        ? '.png'
        : mime === 'image/webp'
          ? '.webp'
          : '.jpg';
    const storagePath = `${ASSET_CONFIG[assetType].storagePrefix}/${parkingId}/current${ext}`;

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

    await ensureParkingSettings(parkingId);
    const service = createServiceClient();
    const { error: updateError } = await service
      .from('parking_settings')
      .update({
        [ASSET_CONFIG[assetType].column]: safePublicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('parking_id', parkingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    console.log(`[upload-parking-settings-asset] Uploaded ${assetType} for ${parkingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: safePublicUrl,
          bucket: BUCKET,
          path: storagePath,
          column: ASSET_CONFIG[assetType].column,
        },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[upload-parking-settings-asset]', error);
    const status = error instanceof Response ? error.status : 400;
    const message =
      error instanceof Response
        ? await error
            .clone()
            .json()
            .then((b: { error?: string }) => b.error)
            .catch(() => 'Unauthorized')
        : (error as Error).message;

    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
