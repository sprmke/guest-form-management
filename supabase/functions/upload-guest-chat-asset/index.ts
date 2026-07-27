/**
 * upload-guest-chat-asset — Guest web chat image/PDF upload.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { assertGuestOwnsWebConversation } from '../_shared/webGuestChatService.ts';
import type { NormalizedInboxAttachment } from '../_shared/inboxAttachments.ts';
import { jsonError, jsonSuccess } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const BUCKET = 'guest-chat-attachments';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

serveAuthenticated('upload-guest-chat-asset', async (req, user) => {
  if (req.method !== 'POST') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const conversationId = String(
    formData.get('conversationId') ?? formData.get('conversation_id') ?? ''
  ).trim();

  if (!(file instanceof File)) {
    return jsonError(req, 'file is required', 400);
  }
  if (!conversationId) {
    return jsonError(req, 'conversationId is required', 400);
  }

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return jsonError(req, 'File must be JPEG, PNG, WebP, or PDF', 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return jsonError(req, 'File must be 10 MB or smaller', 400);
  }

  let conv;
  try {
    conv = await assertGuestOwnsWebConversation(user.id, conversationId);
  } catch (e) {
    const message = (e as Error).message;
    if (message === 'Conversation not found') return jsonError(req, message, 404);
    throw e;
  }

  const ext =
    mime === 'image/png'
      ? '.png'
      : mime === 'image/webp'
        ? '.webp'
        : mime === 'application/pdf'
          ? '.pdf'
          : '.jpg';
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
