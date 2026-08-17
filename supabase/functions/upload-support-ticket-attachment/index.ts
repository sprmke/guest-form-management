/**
 * upload-support-ticket-attachment — bug-report screenshot/video upload, ahead of
 * submit-support-ticket. Private bucket — returns a storage path, not a public URL.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';

const BUCKET = 'support-ticket-attachments';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);
const MAX_BYTES = 20 * 1024 * 1024;

serveAuthenticated('upload-support-ticket-attachment', async (req) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError(req, 'file is required', 400);
  }

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return jsonError(req, 'File must be JPEG, PNG, WebP, MP4, or MOV', 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError(req, 'File must be 20 MB or smaller', 400);
  }

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: formData.get('orgSlug') ? String(formData.get('orgSlug')) : null,
    orgId: formData.get('orgId') ? String(formData.get('orgId')) : null,
    propertyId: formData.get('propertyId') ? String(formData.get('propertyId')) : null,
    parkingId: formData.get('parkingId') ? String(formData.get('parkingId')) : null,
  });

  const safeName =
    String(file.name ?? 'upload')
      .replace(/[^\w.\-() ]+/g, '_')
      .slice(0, 120) || 'upload';
  const storagePath = `${scope.org.id}/${scope.user.id}/${crypto.randomUUID()}-${safeName}`;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: mime });

  if (uploadError) {
    return jsonError(req, `Upload failed: ${uploadError.message}`, 500);
  }

  return jsonSuccess(req, {
    attachment: {
      name: safeName,
      mimeType: mime,
      size: file.size,
      path: storagePath,
    },
  });
});
