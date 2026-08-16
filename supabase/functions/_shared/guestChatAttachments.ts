/**
 * Validate guest web chat attachment payloads stored on social_messages.attachments.
 */

import type { NormalizedInboxAttachment } from './inboxAttachments.ts';

const MAX_ATTACHMENTS = 4;
const BUCKET_SEGMENT = '/guest-chat-attachments/';

export function buildMessagePreview(
  text: string | null,
  attachments: NormalizedInboxAttachment[]
): string {
  const trimmed = text?.trim();
  if (trimmed) return trimmed.slice(0, 500);
  if (attachments.length > 0) return '(attachment)';
  return '';
}

export function parseGuestWebChatAttachments(raw: unknown): NormalizedInboxAttachment[] {
  if (!Array.isArray(raw)) return [];

  const out: NormalizedInboxAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    const kind = row.kind;
    if (!url.includes(BUCKET_SEGMENT)) continue;
    if (kind !== 'image' && kind !== 'file') continue;
    out.push({
      kind,
      url,
      label: typeof row.label === 'string' ? row.label.slice(0, 200) : undefined,
    });
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}

export function assertGuestWebMessagePayload(
  text: string,
  attachments: NormalizedInboxAttachment[]
): void {
  if (!text.trim() && attachments.length === 0) {
    throw new Error('Message text or attachment required');
  }
}
