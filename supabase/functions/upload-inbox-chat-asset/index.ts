/**
 * upload-inbox-chat-asset — Host inbox image/PDF upload (web chat replies).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { resolveInboxAccess } from '../_shared/inboxAccess.ts';
import type { NormalizedInboxAttachment } from '../_shared/inboxAttachments.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { conversationAllowedInScope, getConversationById } from '../_shared/socialInboxService.ts';
import { resolveMetaConnectionIdsForScope } from '../_shared/metaInboxScope.ts';
import { assertWithinUploadLimit } from '../_shared/uploadLimits.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'guest-chat-attachments';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/heic') return '.heic';
  if (mime === 'image/heif') return '.heif';
  return '.jpg';
}

serveAuthenticated('upload-inbox-chat-asset', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const conversationId = String(
    formData.get('conversationId') ?? formData.get('conversation_id') ?? ''
  ).trim();
  const propertyId = String(formData.get('propertyId') ?? formData.get('property_id') ?? '').trim();
  const parkingId = String(formData.get('parkingId') ?? formData.get('parking_id') ?? '').trim();

  if (!(file instanceof File)) {
    return jsonError(req, 'file is required', 400);
  }
  if (!conversationId) {
    return jsonError(req, 'conversationId is required', 400);
  }

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return jsonError(req, 'File must be JPEG, PNG, WebP, HEIC, or PDF', 400);
  }
  assertWithinUploadLimit(file, mime === 'application/pdf' ? 'pdf' : 'image');

  const scopeBody: Record<string, unknown> = {};
  if (propertyId) scopeBody.propertyId = propertyId;
  if (parkingId) scopeBody.parkingId = parkingId;

  const ctx = await resolveInboxAccess(req, 'reply', scopeBody);
  const conv = await getConversationById(ctx.orgId, conversationId);
  if (!conv) {
    return jsonError(req, 'Conversation not found', 404);
  }

  if (conv.platform !== 'web') {
    return jsonError(req, 'Attachments are only supported for website chat', 400);
  }

  const metaIds = new Set(await resolveMetaConnectionIdsForScope(ctx.orgId, ctx.scope));
  if (
    !conversationAllowedInScope(conv, {
      propertyId: ctx.propertyId,
      parkingId: ctx.parkingId,
      metaIds,
    })
  ) {
    return jsonError(req, 'Conversation not found', 404);
  }

  void user;

  const ext = extensionForMime(mime);
  const fileName = String(formData.get('fileName') ?? file.name ?? `upload${ext}`).trim();
  const safeName = fileName.replace(/[^\w.\-() ]+/g, '_').slice(0, 120) || `upload${ext}`;
  const storagePath = `${conv.organization_id}/${conv.id}/${crypto.randomUUID()}${ext}`;

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

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const url = formatPublicUrl(publicUrl);

  const attachment: NormalizedInboxAttachment = {
    kind: mime === 'application/pdf' ? 'file' : 'image',
    url,
    label: safeName,
  };

  return jsonSuccess(req, { attachment });
});
