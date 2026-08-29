/**
 * upload-org-settings-asset — Admin upload for org-scoped team logo.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { handleEdgeError } from '../_shared/httpResponse.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { invalidateAppSettingsCache } from '../_shared/appSettings.ts';
import { ensureOrgSettingsRow, invalidateOrgSettingsCache } from '../_shared/orgSettings.ts';
import { resolveOrgAccessContext } from '../_shared/propertyScope.ts';
import { assertWithinUploadLimit } from '../_shared/uploadLimits.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'app-settings-assets';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const admin = await verifyAdminJwt(req);
    const ctx = await resolveOrgAccessContext(req, 'org:settings:edit');
    const organizationId = ctx.org.id;

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const assetType = formData.get('assetType') as string;
    const file = formData.get('file') as File;
    const fileName = (formData.get('fileName') as string) || file?.name;

    if (assetType !== 'team_logo') {
      throw new Error(`Invalid assetType: "${assetType}"`);
    }
    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw new Error('File must be JPEG, PNG, or WebP');
    }
    assertWithinUploadLimit(file, 'image');

    const ext = fileName.includes('.')
      ? `.${fileName.split('.').pop()?.toLowerCase()}`
      : mime === 'image/png'
        ? '.png'
        : mime === 'image/webp'
          ? '.webp'
          : '.jpg';
    const storagePath = `team-logo/org/${organizationId}/current${ext}`;

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

    if (assetType === 'team_logo') {
      await ensureOrgSettingsRow(organizationId);
      await DatabaseService.updateOrgSettings(
        {
          email_logo_url: safePublicUrl,
        },
        organizationId
      );

      await supabase
        .from('organizations')
        .update({ logo_url: safePublicUrl })
        .eq('id', organizationId);

      invalidateOrgSettingsCache(organizationId);
      invalidateAppSettingsCache();

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url: safePublicUrl,
            bucket: BUCKET,
            path: storagePath,
            column: 'email_logo_url',
          },
        }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Invalid assetType: "${assetType}"`);
  } catch (error) {
    return await handleEdgeError(req, error, '[upload-org-settings-asset]');
  }
});
