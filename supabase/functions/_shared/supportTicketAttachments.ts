import type { SupportTicketScope } from './supportTicketScope.ts';

export type IncomingSupportTicketAttachment = {
  name: string;
  mimeType: string;
  size: number;
  path: string;
};

export function parseIncomingSupportTicketAttachments(
  raw: unknown
): IncomingSupportTicketAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, 3)
    .map((item) => ({
      name: String(item.name ?? 'file').slice(0, 120),
      mimeType: String(item.mimeType ?? 'application/octet-stream'),
      size: typeof item.size === 'number' ? item.size : 0,
      path: String(item.path ?? ''),
    }))
    .filter((item) => item.path.length > 0);
}

export function attachmentStorageRoot(scope: SupportTicketScope): string {
  return scope.org?.id ?? 'guest';
}

/** Paths must live under `{orgId|guest}/{userId}/` for the authenticated submitter. */
export function isValidSupportTicketAttachmentPath(
  path: string,
  scope: SupportTicketScope
): boolean {
  if (!path || path.includes('..')) return false;
  const prefix = `${attachmentStorageRoot(scope)}/${scope.user.id}/`;
  return path.startsWith(prefix);
}

export function validateSupportTicketAttachments(
  raw: unknown,
  scope: SupportTicketScope
): IncomingSupportTicketAttachment[] {
  const attachments = parseIncomingSupportTicketAttachments(raw);
  for (const attachment of attachments) {
    if (!isValidSupportTicketAttachmentPath(attachment.path, scope)) {
      throw new Error('Invalid attachment path');
    }
  }
  return attachments;
}

export const SUPPORT_TICKET_ATTACHMENT_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
]);
