/**
 * gmail-listener — Phase 4 scheduled edge function.
 *
 * Purpose:  Polls Gmail (kamehome.azurenorth@gmail.com) for Azure approval emails
 *           containing "APPROVED GAF.pdf".  On match, downloads the attachment,
 *           uploads to Supabase Storage, and calls workflowOrchestrator.transition().
 *
 * Trigger:  Supabase cron — every 5 minutes.
 *
 * Idempotency:
 *   - `gmail_listener_state` table holds the Gmail `historyId` cursor.
 *   - `processed_emails` table holds message IDs that have been handled (applied/skipped/failed).
 *   - Both layers are required: history can replay/expire, so the DB dedupe is the durable layer.
 *   - After each poll, **reconciliation** re-applies approval state for rows where an admin marked
 *     GAF/pet “incomplete” (`*_manual_incomplete`) but `approved_*_pdf_url` is already set — Gmail
 *     will not re-deliver the same message, so we refresh from DB + orchestrator without re-fetching MIME.
 *
 * Secrets required (either path):
 *   A) Web OAuth (in-app Connect Gmail): GMAIL_API_WEB_CLIENT_JSON, GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY,
 *      refresh token in `gmail_mail_integration` (written by google-mail-oauth-callback).
 *   B) Legacy: GMAIL_OAUTH_CLIENT_JSON + GMAIL_OAUTH_TOKEN_JSON (`npm run gmail-auth`).
 *   PERMIT_APPROVER_EMAIL      — Permit approver sender email(s) allowed for
 *                                GAF/Pet approval replies. Comma-separated.
 *   SUPABASE_URL               — set automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — set automatically by Supabase
 *
 * Reference: docs/NEW_FLOW_PLAN.md §3.4, .cursor/rules/booking-workflow.mdc §3
 *            .cursor/skills/gmail-listener/SKILL.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { WorkflowOrchestrator } from '../_shared/workflowOrchestrator.ts';
import { BookingStatus } from '../_shared/statusMachine.ts';
import { formatPublicUrl } from '../_shared/utils.ts';
import { getGmailAccessTokenUnified } from '../_shared/gmailMailOAuthAccess.ts';

// Gmail OAuth: DB-stored web refresh token (GMAIL_API_WEB_CLIENT_JSON) preferred;
// else legacy GMAIL_OAUTH_CLIENT_JSON + GMAIL_OAUTH_TOKEN_JSON env blobs (`npm run gmail-auth`).

/** Dev flags for listener-driven `WorkflowOrchestrator.transition` (no outbound request emails). */
const GMAIL_LISTENER_DEV_CONTROLS = {
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

// ─── Gmail REST helpers ────────────────────────────────────────────────────────

const GMAIL_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

async function gmailGet(path: string, accessToken: string): Promise<any> {
  const resp = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Gmail GET ${path} failed (${resp.status}): ${body}`);
    (err as any).status = resp.status;
    throw err;
  }
  return resp.json();
}

async function getMailboxHistoryId(accessToken: string): Promise<string> {
  const profile = await gmailGet('/profile', accessToken);
  if (!profile.historyId) throw new Error('Gmail profile missing historyId');
  return String(profile.historyId);
}

type HistoryPollResult = {
  newHistoryId: string;
  addedMessageIds: string[];
};

async function listAddedMessageIdsSince(
  accessToken: string,
  startHistoryId: string,
): Promise<HistoryPollResult> {
  const seen = new Set<string>();
  const addedMessageIds: string[] = [];
  let pageToken: string | undefined;
  let newHistoryId = startHistoryId;

  try {
    for (;;) {
      const params = new URLSearchParams({
        startHistoryId,
        historyTypes: 'messageAdded',
        maxResults: '500',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const data = await gmailGet(`/history?${params}`, accessToken);

      if (data.historyId) newHistoryId = String(data.historyId);

      for (const h of data.history ?? []) {
        for (const m of h.messagesAdded ?? []) {
          const id = m.message?.id;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          addedMessageIds.push(id);
        }
      }

      pageToken = data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }
  } catch (e: any) {
    if (e?.status === 404) {
      const err = new Error(
        'Gmail history expired or invalid startHistoryId — re-initializing cursor',
      );
      (err as any).historyExpired = true;
      throw err;
    }
    throw e;
  }

  return { newHistoryId, addedMessageIds };
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
  // Gmail uses URL-safe base64 encoding
  const b64 = (data.data as string).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── MIME helpers ──────────────────────────────────────────────────────────────

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

function collectAttachmentParts(part: any, out: AttachmentInfo[]): void {
  if (!part) return;
  if (part.parts) {
    for (const p of part.parts) collectAttachmentParts(p, out);
  }
  if (part.body?.attachmentId && part.filename) {
    out.push({ attachmentId: part.body.attachmentId, filename: part.filename });
  }
}

// ─── Subject parsing ───────────────────────────────────────────────────────────

type ApprovalKind = 'gaf' | 'pet';

type ParsedApprovalSubject = {
  kind: ApprovalKind;
  checkInDate: string;   // MM-DD-YYYY
  checkOutDate: string;  // MM-DD-YYYY
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

  // Handles subjects like "May 13, 2026"
  const parsed = new Date(token);
  if (!Number.isNaN(parsed.getTime())) {
    return toMmDdYyyy(parsed);
  }
  return null;
}

/**
 * Parse Azure approval email subject.
 *
 * Expected formats (from emailService.ts):
 *   Monaco 2604 - GAF Request (MM-DD-YYYY to MM-DD-YYYY)
 *   Monaco 2604 - Pet Request (MM-DD-YYYY to MM-DD-YYYY)
 *
 * Optional prefixes (stripped before matching):
 *   ⚠️ TEST - , 🚨 URGENT - , (Updated)
 */
function parseApprovalSubject(subject: string): ParsedApprovalSubject | null {
  // Check for required attachment keyword as a secondary guard — skipped here;
  // actual attachment presence is checked on the message parts.

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

// ─── DB helpers ───────────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function loadHistoryId(): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('gmail_listener_state')
    .select('history_id')
    .limit(1)
    .maybeSingle();
  return data?.history_id ?? null;
}

async function resolveListenerMailboxEmail(): Promise<string> {
  const { data } = await supabaseAdmin()
    .from('gmail_mail_integration')
    .select('google_account_email')
    .eq('id', 'default')
    .maybeSingle();
  const fromIntegration = data?.google_account_email as string | undefined;
  if (fromIntegration?.trim()) return fromIntegration.trim();
  return 'kamehome.azurenorth@gmail.com';
}

async function saveHistoryId(historyId: string): Promise<void> {
  const sb = supabaseAdmin();
  const email_address = await resolveListenerMailboxEmail();
  // gmail_listener_state has exactly one row with id = 'default' (singleton constraint).
  const { error } = await sb.from('gmail_listener_state').upsert(
    {
      id: 'default',
      email_address,
      history_id: historyId,
      last_poll_at: new Date().toISOString(),
      last_poll_status: 'ok',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) console.error('[gmail-listener] Failed to save historyId:', error);
}

async function isAlreadyProcessed(messageId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('processed_emails')
    .select('message_id')
    .eq('message_id', messageId)
    .maybeSingle();
  return !!data;
}

type ProcessedEmailStatus = 'applied' | 'skipped' | 'failed';

async function recordProcessedEmail(params: {
  messageId: string;
  kind: ApprovalKind;
  status: ProcessedEmailStatus;
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
  if (error) console.error('[gmail-listener] Failed to record processed email:', error);
}

/**
 * Find a booking matching the parsed date range and expected status.
 * Returns null if none found, or throws with `ambiguous: true` if multiple matches.
 */
async function findBookingForApproval(params: {
  checkInDate: string;
  checkOutDate: string;
  expectedStatuses: BookingStatus[];
}): Promise<{ id: string; [key: string]: any } | null> {
  const { data, error } = await supabaseAdmin()
    .from('guest_submissions')
    .select('*')
    .eq('check_in_date', params.checkInDate)
    .eq('check_out_date', params.checkOutDate)
    .in('status', params.expectedStatuses);

  if (error) throw new Error(`DB lookup failed: ${error.message}`);

  if (!data || data.length === 0) return null;

  if (data.length > 1) {
    const err = new Error(
      `Ambiguous: ${data.length} bookings match ${params.checkInDate} → ${params.checkOutDate} with statuses ${params.expectedStatuses.join(', ')}`,
    );
    (err as any).ambiguous = true;
    (err as any).matchCount = data.length;
    throw err;
  }

  return data[0];
}

// ─── Storage upload ────────────────────────────────────────────────────────────

/**
 * Upload the approved PDF bytes to the appropriate Supabase Storage bucket.
 * Returns the public/signed URL of the uploaded file.
 */
async function uploadApprovedPdf(params: {
  kind: ApprovalKind;
  bookingId: string;
  bytes: Uint8Array;
}): Promise<string> {
  const sb = supabaseAdmin();
  const bucket = params.kind === 'gaf' ? 'approved-gafs' : 'approved-pet-forms';
  // Path is just {bookingId}/approved-gaf.pdf — UUID uniquely identifies the booking.
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

// ─── Message processing ────────────────────────────────────────────────────────

async function processMessage(messageId: string, accessToken: string): Promise<{
  action: 'applied' | 'skipped' | 'failed';
  reason?: string;
  bookingId?: string;
  kind?: ApprovalKind;
}> {
  // 1. Fetch full message (format=full required to see payload.parts with attachments)
  let full: any;
  try {
    full = await getFullMessage(accessToken, messageId);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    // Gmail users.history often lists message IDs that no longer exist as full messages
    // (deleted drafts, consolidated thread IDs, or race with immediate delete). Not an error.
    if (status === 404) {
      console.warn(
        `[gmail-listener] Message ${messageId.slice(0, 16)}… GET /messages/… returned 404 (gone or inaccessible) — skipping`,
      );
      return { action: 'skipped', reason: 'gmail_message_not_found_404', kind: 'gaf' };
    }
    throw e;
  }
  const subject = getHeader(full.payload?.headers, 'Subject');
  const fromHeader = getHeader(full.payload?.headers, 'From');
  const senderEmail = extractEmailAddress(fromHeader);

  console.log(`[gmail-listener] Message ${messageId.slice(0, 16)}… Subject: ${subject.slice(0, 80)}`);

  // 2. Parse subject
  const parsed = parseApprovalSubject(subject);
  if (!parsed) {
    return { action: 'skipped', reason: 'subject_no_match', kind: 'gaf' };
  }

  // 2b. Enforce sender allow-list for permit approvers when configured.
  // If env is empty, listener remains permissive for backwards compatibility.
  const allowedApprovers = permitApproverAllowList();
  if (allowedApprovers.length > 0 && !allowedApprovers.includes(senderEmail)) {
    console.warn(
      `[gmail-listener] Sender not in PERMIT_APPROVER_EMAIL allow-list: ` +
      `"${senderEmail || fromHeader || 'unknown'}"`,
    );
    return { action: 'skipped', reason: `sender_not_allowed:${senderEmail || 'unknown'}`, kind: parsed.kind };
  }

  // 3. Find approved attachment (kind-aware; tolerant filename variants)
  const attachments: AttachmentInfo[] = [];
  collectAttachmentParts(full.payload, attachments);

  const approvedPdf = findApprovedAttachment(parsed.kind, attachments);

  if (!approvedPdf) {
    return {
      action: 'skipped',
      reason: parsed.kind === 'pet'
        ? 'no_approved_pet_attachment'
        : 'no_approved_gaf_attachment',
      kind: parsed.kind,
    };
  }

  console.log(`[gmail-listener] Found approval (${parsed.kind}): ${parsed.checkInDate} → ${parsed.checkOutDate}`);

  // 4. Determine expected status for the DB lookup
  const expectedStatuses: BookingStatus[] =
    parsed.kind === 'gaf'
      ? ['PENDING_DOCUMENTS', 'PENDING_GAF']
      : ['PENDING_DOCUMENTS', 'PENDING_PET_REQUEST'];

  // 5. Find the booking
  let booking: { id: string; [key: string]: any } | null;
  try {
    booking = await findBookingForApproval({
      checkInDate: parsed.checkInDate,
      checkOutDate: parsed.checkOutDate,
      expectedStatuses,
    });
  } catch (e: any) {
    if (e?.ambiguous) {
      console.warn(`[gmail-listener] ${e.message} — recording as skipped (Q6.5 manual resolution)`);
      return { action: 'skipped', reason: `ambiguous_multiple_bookings (${e.matchCount})`, kind: parsed.kind };
    }
    throw e;
  }

  if (!booking) {
    console.warn(
      `[gmail-listener] No ${expectedStatuses.join(' or ')} booking found for dates ${parsed.checkInDate} → ${parsed.checkOutDate}`,
    );
    return { action: 'skipped', reason: `no_booking_found_for_${expectedStatuses.join('_or_')}`, kind: parsed.kind };
  }

  const bookingId = booking.id as string;

  // 6. Download attachment bytes
  const bytes = await downloadAttachment(accessToken, messageId, approvedPdf.attachmentId);
  console.log(`[gmail-listener] Downloaded ${bytes.length} bytes for booking ${bookingId}`);

  // 7. Upload to Supabase Storage
  const pdfUrl = await uploadApprovedPdf({ kind: parsed.kind, bookingId, bytes });
  console.log(`[gmail-listener] Uploaded PDF → ${pdfUrl}`);

  // 8. Mark the corresponding pending-document sub-status as complete
  const toStatus: BookingStatus = 'PENDING_DOCUMENTS';
  const payload: Record<string, any> = {};

  if (parsed.kind === 'gaf') {
    payload.approved_gaf_pdf_url = pdfUrl;
    payload.document_completion_target = 'PENDING_GAF';
  } else {
    // pet approval
    payload.approved_pet_pdf_url = pdfUrl;
    payload.document_completion_target = 'PENDING_PET_REQUEST';
  }

  console.log(`[gmail-listener] Marking document sub-status complete for booking ${bookingId}: ${payload.document_completion_target}`);

  // 9. Call orchestrator (no dev controls — listener runs all side effects)
  await WorkflowOrchestrator.transition(
    bookingId,
    toStatus,
    payload,
    { ...GMAIL_LISTENER_DEV_CONTROLS },
    false, // manual=false — listener-driven transition
  );

  return { action: 'applied', bookingId, kind: parsed.kind };
}

/**
 * Re-apply GAF/pet nested completion when admins marked a sub-step incomplete but the row still
 * has an `approved_*_pdf_url` from a prior Gmail apply. Those message IDs stay in `processed_emails`,
 * and history often has no new messages — so this pass runs on every poll (usually 0 rows).
 */
async function reconcileManualIncompleteApprovals(): Promise<{ gaf: number; pet: number }> {
  const sb = supabaseAdmin();
  let gaf = 0;
  let pet = 0;

  const { data: gafRows, error: gafErr } = await sb
    .from('guest_submissions')
    .select('id, approved_gaf_pdf_url')
    .eq('status', 'PENDING_DOCUMENTS')
    .eq('gaf_manual_incomplete', true)
    .not('approved_gaf_pdf_url', 'is', null);

  if (gafErr) {
    console.error('[gmail-listener] reconcile GAF query failed:', gafErr.message);
  } else {
    for (const row of gafRows ?? []) {
      const url = (row.approved_gaf_pdf_url as string | null)?.trim();
      if (!url) continue;
      try {
        await WorkflowOrchestrator.transition(
          row.id as string,
          'PENDING_DOCUMENTS',
          {
            approved_gaf_pdf_url: url,
            document_completion_target: 'PENDING_GAF',
          },
          { ...GMAIL_LISTENER_DEV_CONTROLS },
          false,
        );
        gaf++;
        console.log(
          `[gmail-listener] Reconciled GAF for booking ${row.id} (manual incomplete + existing PDF URL)`,
        );
      } catch (e: unknown) {
        console.error(
          `[gmail-listener] Reconcile GAF failed for ${row.id}:`,
          (e as Error).message,
        );
      }
    }
  }

  const { data: petRows, error: petErr } = await sb
    .from('guest_submissions')
    .select('id, approved_pet_pdf_url')
    .eq('status', 'PENDING_DOCUMENTS')
    .eq('pet_manual_incomplete', true)
    .not('approved_pet_pdf_url', 'is', null);

  if (petErr) {
    console.error('[gmail-listener] reconcile pet query failed:', petErr.message);
  } else {
    for (const row of petRows ?? []) {
      const url = (row.approved_pet_pdf_url as string | null)?.trim();
      if (!url) continue;
      try {
        await WorkflowOrchestrator.transition(
          row.id as string,
          'PENDING_DOCUMENTS',
          {
            approved_pet_pdf_url: url,
            document_completion_target: 'PENDING_PET_REQUEST',
          },
          { ...GMAIL_LISTENER_DEV_CONTROLS },
          false,
        );
        pet++;
        console.log(
          `[gmail-listener] Reconciled pet for booking ${row.id} (manual incomplete + existing PDF URL)`,
        );
      } catch (e: unknown) {
        console.error(
          `[gmail-listener] Reconcile pet failed for ${row.id}:`,
          (e as Error).message,
        );
      }
    }
  }

  return { gaf, pet };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  console.log('[gmail-listener] Run started at', new Date().toISOString());

  try {
    // 1. Get Gmail access token
    let accessToken: string;
    try {
      ({ accessToken } = await getGmailAccessTokenUnified());
    } catch (e: any) {
      console.error('[gmail-listener] OAuth failed:', e.message);
      const needsReAuth =
        e?.needsReAuth === true ||
        e.message?.includes('invalid_grant') ||
        e.message?.includes('Reconnect Gmail');
      // Return 200 so cron doesn't alarm — the error is logged; ops must re-auth
      return new Response(
        JSON.stringify({ success: false, error: e.message, needsReAuth }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.log('[gmail-listener] Gmail OAuth OK');

    // 2. Load or initialize historyId cursor
    let startHistoryId = await loadHistoryId();

    if (!startHistoryId) {
      // First run — initialize to current mailbox historyId (no backlog)
      startHistoryId = await getMailboxHistoryId(accessToken);
      await saveHistoryId(startHistoryId);
      console.log(`[gmail-listener] Initialized historyId=${startHistoryId} (no backlog)`);
      return new Response(
        JSON.stringify({ success: true, initialized: true, historyId: startHistoryId }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // 3. Poll for new messages since last historyId
    let poll: { newHistoryId: string; addedMessageIds: string[] };
    try {
      poll = await listAddedMessageIdsSince(accessToken, startHistoryId);
    } catch (e: any) {
      if (e?.historyExpired) {
        // History cursor expired — reset to current position
        const newId = await getMailboxHistoryId(accessToken);
        await saveHistoryId(newId);
        console.warn(`[gmail-listener] History expired. Reset historyId to ${newId}. Missed messages must be re-reviewed manually.`);
        return new Response(
          JSON.stringify({ success: true, historyReset: true, newHistoryId: newId }),
          { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
      throw e;
    }

    const { newHistoryId, addedMessageIds } = poll;

    console.log(`[gmail-listener] ${addedMessageIds.length} new message(s) since historyId=${startHistoryId}`);

    if (addedMessageIds.length === 0) {
      await saveHistoryId(newHistoryId);
      const reconciled = await reconcileManualIncompleteApprovals();
      const reconciledTotal = reconciled.gaf + reconciled.pet;
      return new Response(
        JSON.stringify({
          success: true,
          messagesScanned: 0,
          applied: 0,
          skipped: 0,
          failed: 0,
          reconciled: reconciledTotal,
          reconciledGaf: reconciled.gaf,
          reconciledPet: reconciled.pet,
        }),
        { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    // 4. Process each message
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{ messageId: string; action: string; reason?: string; bookingId?: string }> = [];

    for (const messageId of addedMessageIds) {
      // Durable dedupe: check DB first
      if (await isAlreadyProcessed(messageId)) {
        console.log(`[gmail-listener] Skip (already processed): ${messageId.slice(0, 16)}…`);
        skipped++;
        continue;
      }

      let action: 'applied' | 'skipped' | 'failed';
      let reason: string | undefined;
      let bookingId: string | undefined;
      let kind: ApprovalKind = 'gaf'; // best-effort default for unresolvable messages

      try {
        const result = await processMessage(messageId, accessToken);
        action = result.action;
        reason = result.reason;
        bookingId = result.bookingId;
        if (result.kind) kind = result.kind;
      } catch (e: any) {
        console.error(`[gmail-listener] Message ${messageId.slice(0, 16)}… error:`, e.message);
        action = 'failed';
        reason = e.message;
      }

      // Always record processed so we don't re-process on next poll.
      // For 'failed' we still record — admin must resolve manually.
      await recordProcessedEmail({
        messageId,
        kind,
        status: action,
        reason,
        bookingId,
      });

      results.push({ messageId: messageId.slice(0, 16), action, reason, bookingId });

      if (action === 'applied') applied++;
      else if (action === 'skipped') skipped++;
      else failed++;
    }

    // 5. Advance historyId cursor (always, even on partial failures)
    await saveHistoryId(newHistoryId);

    const reconciled = await reconcileManualIncompleteApprovals();
    const reconciledTotal = reconciled.gaf + reconciled.pet;

    const summary = {
      success: true,
      messagesScanned: addedMessageIds.length,
      applied,
      skipped,
      failed,
      reconciled: reconciledTotal,
      reconciledGaf: reconciled.gaf,
      reconciledPet: reconciled.pet,
      historyId: newHistoryId,
      results,
    };

    console.log(
      '[gmail-listener] Run complete:',
      JSON.stringify({ applied, skipped, failed, reconciled: reconciledTotal }),
    );

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gmail-listener] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
