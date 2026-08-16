/**
 * upload-property-template-asset — Admin upload for standard template images.
 * - section_image: persists section_image_url on property_template_contents
 * - inline_image: returns public URL for WYSIWYG editor embeds
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getBuiltinPropertyTemplate,
  isBuiltinPropertyTemplateKey,
  upsertPropertyTemplateRow,
} from '../_shared/propertyTemplates.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'app-settings-assets';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STANDARD_KEYS = new Set([
  'house-rules',
  'check-in-instructions',
  'check-out-instructions',
  'parking-reminders',
]);

type AssetType = 'section_image' | 'inline_image';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const { property } = await resolveScopedPropertyAccess(req, 'templates:edit');
    const propertyId = property.id;

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const assetType = formData.get('assetType') as AssetType;
    const file = formData.get('file') as File;
    const templateKey = String(formData.get('templateKey') ?? '').trim();
    const fileName = (formData.get('fileName') as string) || file?.name;

    if (assetType !== 'section_image' && assetType !== 'inline_image') {
      throw new Error(`Invalid assetType: "${assetType}"`);
    }
    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');
    if (assetType === 'section_image') {
      if (!templateKey || !isBuiltinPropertyTemplateKey(templateKey)) {
        throw new Error('templateKey is required for section_image');
      }
      const builtin = getBuiltinPropertyTemplate(templateKey);
      if (!builtin || builtin.category !== 'standard') {
        throw new Error('Section images are only supported for standard templates');
      }
      if (!STANDARD_KEYS.has(templateKey)) {
        throw new Error('Unknown standard template key');
      }
    }

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

    const storagePath =
      assetType === 'section_image'
        ? `template-section/${propertyId}/${templateKey}${ext}`
        : `template-inline/${propertyId}/${crypto.randomUUID()}${ext}`;

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

    if (assetType === 'section_image') {
      const builtin = getBuiltinPropertyTemplate(templateKey)!;
      const { data: existing } = await supabase
        .from('property_template_contents')
        .select('content')
        .eq('property_id', propertyId)
        .eq('template_key', templateKey)
        .maybeSingle();

      await upsertPropertyTemplateRow({
        propertyId,
        templateKey,
        category: 'standard',
        content: String(existing?.content ?? builtin.defaultContent),
        sectionImageUrl: safePublicUrl,
      });
    }

    console.log(`[upload-property-template-asset] Uploaded ${assetType}: ${safePublicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: safePublicUrl,
          bucket: BUCKET,
          path: storagePath,
          templateKey: templateKey || null,
        },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[upload-property-template-asset]', error);
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
