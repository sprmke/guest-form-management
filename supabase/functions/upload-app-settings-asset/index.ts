/**
 * upload-app-settings-asset — Admin upload for operator-level assets (GCash QR, team logo, GAF signature).
 * Auth: verifyAdminJwt. Writes public URL to app_settings.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { invalidateAppSettingsCache } from '../_shared/appSettings.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'app-settings-assets';

const ASSET_CONFIG = {
  gcash_qr: {
    column: 'gcash_qr_image_url',
    storagePrefix: 'gcash-qr',
  },
  team_logo: {
    column: 'email_logo_url',
    storagePrefix: 'team-logo',
  },
  gaf_unit_owner_signature: {
    column: 'gaf_unit_owner_signature_url',
    storagePrefix: 'gaf-unit-owner-signature',
    allowedMime: new Set(['image/jpeg', 'image/png']),
  },
} as const satisfies Record<
  string,
  {
    column: string;
    storagePrefix: string;
    allowedMime?: Set<string>;
  }
>;

type AssetType = keyof typeof ASSET_CONFIG;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    const assetType = formData.get('assetType') as AssetType;
    const file = formData.get('file') as File;
    const fileName = (formData.get('fileName') as string) || file?.name;

    if (!assetType || !ASSET_CONFIG[assetType]) {
      throw new Error(`Invalid assetType: "${assetType}"`);
    }
    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const mime = (file.type || '').toLowerCase();
    const allowedMime = ASSET_CONFIG[assetType].allowedMime ?? ALLOWED_MIME;
    if (!allowedMime.has(mime)) {
      throw new Error(
        assetType === 'gaf_unit_owner_signature'
          ? 'Signature must be PNG or JPEG'
          : 'File must be JPEG, PNG, or WebP',
      );
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
    const storagePath = `${ASSET_CONFIG[assetType].storagePrefix}/current${ext}`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    await DatabaseService.updateAppSettings({
      [ASSET_CONFIG[assetType].column]: safePublicUrl,
    });
    invalidateAppSettingsCache();

    console.log(
      `[upload-app-settings-asset] Uploaded ${assetType}: ${safePublicUrl}`,
    );

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
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[upload-app-settings-asset]', error);
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
