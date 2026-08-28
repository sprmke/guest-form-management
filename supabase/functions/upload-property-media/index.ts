/**
 * upload-property-media — Admin upload/delete for property gallery media.
 * Auth: verifyAdminJwt + resolveAdminPropertyId.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { resolveScopedPropertyAccess } from '../_shared/propertyScope.ts';
import { formatPublicUrl } from '../_shared/utils.ts';
import {
  classifyPropertyMediaMime,
  countPropertyMediaByType,
  maxBytesForPropertyMediaType,
  MAX_PROPERTY_IMAGES,
  MAX_PROPERTY_VIDEOS,
  normalizePropertyMediaItems,
  PROPERTY_MEDIA_BUCKET,
  propertyMediaStoragePath,
  type PropertyMediaRecord,
} from '../_shared/propertyMedia.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';

function extensionForMime(mime: string, fileName: string): string {
  const fromName = fileName.includes('.') ? `.${fileName.split('.').pop()?.toLowerCase()}` : '';
  if (fromName && fromName.length <= 6) return fromName;

  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    case 'video/webm':
      return '.webm';
    case 'video/quicktime':
      return '.mov';
    case 'video/x-msvideo':
      return '.avi';
    case 'video/x-matroska':
      return '.mkv';
    case 'video/ogg':
      return '.ogv';
    default:
      return mime.startsWith('video/') ? '.mp4' : '.jpg';
  }
}

async function readCurrentMedia(propertyId: string): Promise<PropertyMediaRecord[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('properties')
    .select('settings')
    .eq('id', propertyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const settings = data?.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return [];
  }
  return normalizePropertyMediaItems((settings as Record<string, unknown>).media);
}

async function persistMedia(propertyId: string, items: PropertyMediaRecord[]): Promise<void> {
  const supabase = createServiceClient();
  const { data, error: readError } = await supabase
    .from('properties')
    .select('settings')
    .eq('id', propertyId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const currentSettings =
    data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)
      ? (data.settings as Record<string, unknown>)
      : {};

  const { error: updateError } = await supabase
    .from('properties')
    .update({
      settings: {
        ...currentSettings,
        media: items,
      },
    })
    .eq('id', propertyId);

  if (updateError) throw new Error(updateError.message);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const { property } = await resolveScopedPropertyAccess(req, 'settings.media:edit');
    const propertyId = property.id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'DELETE') {
      const body = (await req.json().catch(() => ({}))) as {
        storagePath?: string;
        mediaId?: string;
      };
      const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : '';
      const mediaId = typeof body.mediaId === 'string' ? body.mediaId.trim() : '';

      if (!storagePath && !mediaId) {
        throw new Error('storagePath or mediaId is required');
      }

      const current = await readCurrentMedia(propertyId);
      const next = current.filter((item) => {
        if (mediaId && item.id === mediaId) return false;
        if (storagePath && item.storagePath === storagePath) return false;
        return true;
      });

      const normalized = normalizePropertyMediaItems(next);
      await persistMedia(propertyId, normalized);

      if (storagePath) {
        const expectedPrefix = `${propertyId}/`;
        if (!storagePath.startsWith(expectedPrefix)) {
          throw new Error('Invalid storage path');
        }
        const { error: removeError } = await supabase.storage
          .from(PROPERTY_MEDIA_BUCKET)
          .remove([storagePath]);
        if (removeError) {
          console.warn('[upload-property-media] Storage delete failed:', removeError.message);
        }
      }

      return new Response(JSON.stringify({ success: true, data: { media: normalized } }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileName = (formData.get('fileName') as string) || file?.name || '';

    if (!file) throw new Error('file is required');
    if (!fileName) throw new Error('fileName is required');

    const mime = (file.type || '').toLowerCase();
    const mediaType = classifyPropertyMediaMime(mime);
    if (!mediaType) {
      throw new Error('File must be a supported image or video format');
    }

    const maxBytes = maxBytesForPropertyMediaType(mediaType);
    if (file.size > maxBytes) {
      const limitMb = Math.round(maxBytes / (1024 * 1024));
      throw new Error(`File must be ${limitMb} MB or smaller`);
    }

    const current = await readCurrentMedia(propertyId);
    const counts = countPropertyMediaByType(current);
    if (mediaType === 'image' && counts.images >= MAX_PROPERTY_IMAGES) {
      throw new Error(`At most ${MAX_PROPERTY_IMAGES} images are allowed`);
    }
    if (mediaType === 'video' && counts.videos >= MAX_PROPERTY_VIDEOS) {
      throw new Error(`At most ${MAX_PROPERTY_VIDEOS} video is allowed`);
    }

    const mediaId = crypto.randomUUID();
    const ext = extensionForMime(mime, fileName);
    const storagePath = propertyMediaStoragePath(propertyId, mediaId, ext);

    const { error: uploadError } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(storagePath, file, { upsert: false, contentType: mime });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROPERTY_MEDIA_BUCKET).getPublicUrl(storagePath);
    const safePublicUrl = formatPublicUrl(publicUrl);

    const shouldBePrimary =
      mediaType === 'image' && !current.some((item) => item.type === 'image' && item.isPrimary);

    const newItem: PropertyMediaRecord = {
      id: mediaId,
      url: safePublicUrl,
      storagePath,
      type: mediaType,
      isPrimary: shouldBePrimary,
      order: current.length,
    };

    const next = normalizePropertyMediaItems([...current, newItem]);
    await persistMedia(propertyId, next);

    console.log(`[upload-property-media] Uploaded ${mediaType} for ${propertyId}: ${storagePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          item: newItem,
          media: next,
        },
      }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[upload-property-media]', error);
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
