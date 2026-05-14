/**
 * gmail-backfill-approvals — one-time/admin-triggered historical Gmail backfill.
 *
 * Purpose:
 *   After initializing `gmail-listener` (which intentionally starts at current historyId),
 *   backfill older Azure approval replies for bookings that still miss approved GAF/pet PDFs.
 *
 * Trigger:
 *   Admin-only POST (manual), typically run once during production cutover.
 *
 * Idempotency:
 *   - Reuses `processed_emails` (`message_id` PK) to avoid double-processing.
 *   - `dryRun` mode lets ops preview actions before applying.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import { BookingStatus } from '../_shared/statusMachine.ts';
import { formatPublicUrl } from '../_shared/utils.ts';
import { getGmailAccessTokenUnified } from '../_shared/gmailMailOAuthAccess.ts';

const GMAIL_BASE = 'https://www.googleapis.com/gmail/v1/users/me';
const DEFAULT_LOOKBACK_DAYS = 180;
const DEFAULT_LIMIT_BOOKINGS = 60;
const DEFAULT_MAX_MESSAGES_PER_KIND = 6;

const BACKFILL_DEV_CONTROLS = {
  saveToDatabase: true,
  generatePdf: false,
  updateGoogleCalendar: true,
  updateGoogleSheets: true,
  sendGafRequestEmail: false,
  sendParkingBroadcastEmail: false,
  sendPetRequestEmail: false,
  sendBookingAcknowledgementEmail: false,
  sendReadyForCheckinEmail: false,
} as const;

type ApprovalKind = 'gaf' | 'pet';

type BackfillRequest = {
  dryRun?: boolean;
  lookbackDays?: number;
  limitBookings?: number;
  maxMessagesPerKind?: number;
};

type CandidateBooking = {
  id: string;
  status: BookingStatus;
  check_in_date: string;
  check_out_date: string;
  has_pets: boolean | null;
  approved_gaf_pdf_url: string | null;
  approved_pet_pdf_url: string | null;
};

type BookingTask = {
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  kind: ApprovalKind;
};

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function gmailGet(path: string, accessToken: string): Promise<any> {
  const resp = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Gmail GET ${path} failed (${resp.status}): ${body}`);
    (err as { status?: number }).status = resp.status;
    throw err;
  }
  return resp.json();
}

async function listMessageIdsByQuery(
  accessToken: string,
  query: string,
  maxResults: number,
): Promise<string[]> {
  const encoded = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
    includeSpamTrash: 'false',
  });
  const data = await gmailGet(`/messages?${encoded.toString()}`, accessToken);
  return (data.messages ?? []).map((m: { id?: string }) => m.id).filter(Boolean);
}

async function getFullMessage(accessToken: string, messageId: string): Promise<any> {
  return gmailGet(`/messages/${messageId}?format=full`, accessToken);
}

async function downloadAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
): Promise<Uint8Array> {
  const data = await gmailGet(`/messages/${messageId}/attachments/${attachmentId}`, accessToken);
  const b64 = (data.data as string).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return '';
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

function extractEmailAddress(fromHeader: string): string {
  if (!fromHeader) return '';
  const bracketMatch = fromHeader.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim().toLowerCase();
  return fromHeader.trim().toLowerCase();
}

function permitApproverAllowList(): string[] {
  const raw = (Deno.env.get('PERMIT_APPROVER_EMAIL') ?? '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

type AttachmentInfo = {
  attachmentId: string;
  filename: string;
};

function collectAttachmentParts(part: any, out: AttachmentInfo[]): void {
  if (!part) return;
  if (part.parts) {
    for (const p of part.parts) collectAttachmentParts(p, out);
  }
  if (part.body?.attachmentId && part.filename) {
    out.push({ attachmentId: part.body.attachmentId, filename: part.filename });
  }
}

function normalizeAttachmentFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[ _-]+/g, '')
    .trim();
}

function findApprovedAttachment(kind: ApprovalKind, attachments: AttachmentInfo[]): AttachmentInfo | undefined {
  const accepted =
    kind === 'gaf'
      ? ['approvedgaf.pdf']
      : ['approvedpet.pdf', 'approvedpetform.pdf', 'approvedgaf.pdf'];
  return attachments.find((a) => accepted.includes(normalizeAttachmentFilename(a.filename)));
}

type ParsedApprovalSubject = {
  kind: ApprovalKind;
  checkInDate: string;
  checkOutDate: string;
};

function toMmDdYyyy(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

function parseDateTokenToDbFormat(raw: string): string | null {
  const token = raw.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(token)) return token;
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    const [y, m, d] = token.split('-');
    return `${m}-${d}-${y}`;
  }
  // Handles subjects like "May 13, 2026" (same as gmail-listener)
  const parsed = new Date(token);
  if (!Number.isNaN(parsed.getTime())) {
    return toMmDdYyyy(parsed);
  }
  return null;
}

function parseApprovalSubject(subject: string): ParsedApprovalSubject | null {
  const GAF_RE = /Monaco 2604 - GAF Request \(([^)]+?)\s+to\s+([^)]+?)\)/i;
  const PET_RE = /Monaco 2604 - Pet Request \(([^)]+?)\s+to\s+([^)]+?)\)/i;

  const gafMatch = subject.match(GAF_RE);
  if (gafMatch) {
    const checkInDate = parseDateTokenToDbFormat(gafMatch[1]);
    const checkOutDate = parseDateTokenToDbFormat(gafMatch[2]);
    if (!checkInDate || !checkOutDate) return null;
    return { kind: 'gaf', checkInDate, checkOutDate };
  }

  const petMatch = subject.match(PET_RE);
  if (petMatch) {
    const checkInDate = parseDateTokenToDbFormat(petMatch[1]);
    const checkOutDate = parseDateTokenToDbFormat(petMatch[2]);
    if (!checkInDate || !checkOutDate) return null;
    return { kind: 'pet', checkInDate, checkOutDate };
  }

  return null;
}

async function isAlreadyProcessed(messageId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('processed_emails')
    .select('message_id')
    .eq('message_id', messageId)
    .maybeSingle();
  return !!data;
}

async function recordProcessedEmail(params: {
  messageId: string;
  kind: ApprovalKind;
  status: 'applied' | 'failed';
  reason?: string;
  bookingId?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin().from('processed_emails').upsert(
    {
      message_id: params.messageId,
      kind: params.kind,
      status: params.status,
      reason: params.reason ?? null,
      booking_id: params.bookingId ?? null,
    },
    { onConflict: 'message_id' },
  );
  if (error) {
    console.error('[gmail-backfill-approvals] Failed to record processed email:', error.message);
  }
}

async function uploadApprovedPdf(params: {
  kind: ApprovalKind;
  bookingId: string;
  bytes: Uint8Array;
}): Promise<string> {
  const sb = supabaseAdmin();
  const bucket = params.kind === 'gaf' ? 'approved-gafs' : 'approved-pet-forms';
  const filename = `${params.bookingId}/${params.kind === 'gaf' ? 'approved-gaf' : 'approved-pet'}.pdf`;
  const { error } = await sb.storage.from(bucket).upload(filename, params.bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = sb.storage.from(bucket).getPublicUrl(filename);
  const raw = data?.publicUrl ?? filename;
  return raw.startsWith('http') ? formatPublicUrl(raw) : raw;
}

async function loadCandidateBookings(limit: number): Promise<CandidateBooking[]> {
  const { data, error } = await supabaseAdmin()
    .from('guest_submissions')
    .select('id,status,check_in_date,check_out_date,has_pets,approved_gaf_pdf_url,approved_pet_pdf_url')
    .in('status', ['PENDING_DOCUMENTS', 'PENDING_GAF', 'PENDING_PET_REQUEST'])
    .order('check_in_date', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to load candidate bookings: ${error.message}`);
  return (data ?? []) as CandidateBooking[];
}

function buildTasksFromBooking(booking: CandidateBooking): BookingTask[] {
  const tasks: BookingTask[] = [];
  const base = {
    bookingId: booking.id,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
  };

  const needsGaf =
    booking.status === 'PENDING_GAF' ||
    (booking.status === 'PENDING_DOCUMENTS' && !booking.approved_gaf_pdf_url);
  const needsPet =
    booking.status === 'PENDING_PET_REQUEST' ||
    (booking.status === 'PENDING_DOCUMENTS' && !!booking.has_pets && !booking.approved_pet_pdf_url);

  if (needsGaf) tasks.push({ ...base, kind: 'gaf' });
  if (needsPet) tasks.push({ ...base, kind: 'pet' });
  return tasks;
}

function buildGmailSearchQuery(task: BookingTask, lookbackDays: number): string {
  const subjectPrefix = task.kind === 'gaf' ? 'Monaco 2604 - GAF Request' : 'Monaco 2604 - Pet Request';
  const dateSegment = `(${task.checkInDate} to ${task.checkOutDate})`;
  return `in:anywhere newer_than:${lookbackDays}d subject:"${subjectPrefix} ${dateSegment}" has:attachment filename:pdf`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    await verifyAdminJwt(req);

    const body = (await req.json().catch(() => ({}))) as BackfillRequest;
    const dryRun = body.dryRun ?? true;
    const lookbackDays = Math.max(1, Math.min(body.lookbackDays ?? DEFAULT_LOOKBACK_DAYS, 3650));
    const limitBookings = Math.max(1, Math.min(body.limitBookings ?? DEFAULT_LIMIT_BOOKINGS, 300));
    const maxMessagesPerKind = Math.max(
      1,
      Math.min(body.maxMessagesPerKind ?? DEFAULT_MAX_MESSAGES_PER_KIND, 20),
    );

    let accessToken: string;
    try {
      ({ accessToken } = await getGmailAccessTokenUnified());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[gmail-backfill-approvals] Gmail OAuth failed:', msg);
      const needsReAuth =
        (e as { needsReAuth?: boolean })?.needsReAuth === true ||
        msg.includes('invalid_grant') ||
        msg.includes('Reconnect Gmail');
      return new Response(
        JSON.stringify({ success: false, error: msg, needsReAuth }),
        {
          status: 200,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }
    const candidates = await loadCandidateBookings(limitBookings);
    const tasks = candidates.flatMap(buildTasksFromBooking);

    let applied = 0;
    let wouldApply = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<Record<string, unknown>> = [];
    const allowedApprovers = permitApproverAllowList();

    for (const task of tasks) {
      const query = buildGmailSearchQuery(task, lookbackDays);
      const messageIds = await listMessageIdsByQuery(accessToken, query, maxMessagesPerKind);
      let matched = false;

      for (const messageId of messageIds) {
        if (await isAlreadyProcessed(messageId)) {
          skipped++;
          continue;
        }

        try {
          const full = await getFullMessage(accessToken, messageId);
          const subject = getHeader(full.payload?.headers, 'Subject');
          const fromHeader = getHeader(full.payload?.headers, 'From');
          const senderEmail = extractEmailAddress(fromHeader);
          const parsed = parseApprovalSubject(subject);

          if (!parsed) {
            skipped++;
            continue;
          }
          if (parsed.kind !== task.kind) {
            skipped++;
            continue;
          }
          if (parsed.checkInDate !== task.checkInDate || parsed.checkOutDate !== task.checkOutDate) {
            skipped++;
            continue;
          }
          if (allowedApprovers.length > 0 && !allowedApprovers.includes(senderEmail)) {
            skipped++;
            continue;
          }

          const attachments: AttachmentInfo[] = [];
          collectAttachmentParts(full.payload, attachments);
          const approvedPdf = findApprovedAttachment(task.kind, attachments);

          if (!approvedPdf) {
            skipped++;
            continue;
          }

          if (dryRun) {
            wouldApply++;
            matched = true;
            results.push({
              bookingId: task.bookingId,
              kind: task.kind,
              action: 'would_apply',
              messageId: messageId.slice(0, 16),
              subject,
            });
            break;
          }

          const bytes = await downloadAttachment(accessToken, messageId, approvedPdf.attachmentId);
          const pdfUrl = await uploadApprovedPdf({
            kind: task.kind,
            bookingId: task.bookingId,
            bytes,
          });

          const payload: Record<string, unknown> =
            task.kind === 'gaf'
              ? {
                  approved_gaf_pdf_url: pdfUrl,
                  document_completion_target: 'PENDING_GAF',
                }
              : {
                  approved_pet_pdf_url: pdfUrl,
                  document_completion_target: 'PENDING_PET_REQUEST',
                };

          await WorkflowOrchestrator.transition(
            task.bookingId,
            'PENDING_DOCUMENTS',
            payload,
            { ...BACKFILL_DEV_CONTROLS },
            false,
          );

          await recordProcessedEmail({
            messageId,
            kind: task.kind,
            status: 'applied',
            bookingId: task.bookingId,
            reason: 'backfill_apply',
          });

          applied++;
          matched = true;
          results.push({
            bookingId: task.bookingId,
            kind: task.kind,
            action: 'applied',
            messageId: messageId.slice(0, 16),
            subject,
          });
          break;
        } catch (error) {
          failed++;
          const message = (error as Error).message;
          await recordProcessedEmail({
            messageId,
            kind: task.kind,
            status: 'failed',
            bookingId: task.bookingId,
            reason: `backfill_error:${message}`,
          });
          results.push({
            bookingId: task.bookingId,
            kind: task.kind,
            action: 'failed',
            messageId: messageId.slice(0, 16),
            error: message,
          });
        }
      }

      if (!matched) {
        results.push({
          bookingId: task.bookingId,
          kind: task.kind,
          action: 'no_match',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        settings: {
          lookbackDays,
          limitBookings,
          maxMessagesPerKind,
        },
        scannedBookings: candidates.length,
        tasks: tasks.length,
        applied,
        wouldApply,
        skipped,
        failed,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    if (error instanceof Response) {
      return new Response(await error.text(), {
        status: error.status,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    console.error('[gmail-backfill-approvals] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
