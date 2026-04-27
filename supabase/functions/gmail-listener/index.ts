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
 *
 * Secrets required:
 *   GMAIL_OAUTH_CLIENT_JSON    — Full OAuth client JSON from scripts/gmail-credentials.json
 *                                (set by `npm run gmail-auth` → supabase/.env.local)
 *   GMAIL_OAUTH_TOKEN_JSON     — Token JSON with refresh_token
 *                                (set by `npm run gmail-auth` after browser sign-in)
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

// ─── Gmail OAuth helpers ───────────────────────────────────────────────────────
//
// Secrets are stored as two JSON blobs (set by `npm run gmail-auth`):
//   GMAIL_OAUTH_CLIENT_JSON  — full credentials JSON (web or installed client)
//   GMAIL_OAUTH_TOKEN_JSON   — token JSON with refresh_token
//
// This mirrors the pay-credit-cards pattern, adapted for Supabase secrets instead
// of local JSON files.

type AccessTokenResult = { accessToken: string };

async function getGmailAccessToken(): Promise<AccessTokenResult> {
  const clientJsonRaw = Deno.env.get('GMAIL_OAUTH_CLIENT_JSON');
  const tokenJsonRaw = Deno.env.get('GMAIL_OAUTH_TOKEN_JSON');

  if (!clientJsonRaw || !tokenJsonRaw) {
    throw new Error(
      'Missing Gmail OAuth secrets: GMAIL_OAUTH_CLIENT_JSON and/or GMAIL_OAUTH_TOKEN_JSON. ' +
      'Run `npm run gmail-auth` to generate them.',
    );
  }

  // Parse client credentials JSON — supports both "installed" and "web" client types
  let clientConfig: { client_id: string; client_secret: string };
  try {
    const clientJson = JSON.parse(clientJsonRaw);
    const inner = clientJson.installed ?? clientJson.web;
    if (!inner?.client_id || !inner?.client_secret) {
      throw new Error('client_id or client_secret missing in GMAIL_OAUTH_CLIENT_JSON');
    }
    clientConfig = { client_id: inner.client_id, client_secret: inner.client_secret };
  } catch (e: any) {
    throw new Error(`Failed to parse GMAIL_OAUTH_CLIENT_JSON: ${e.message}`);
  }

  // Parse token JSON — must contain refresh_token
  let refreshToken: string;
  try {
    const tokenJson = JSON.parse(tokenJsonRaw);
    if (!tokenJson.refresh_token) {
      throw new Error('refresh_token missing in GMAIL_OAUTH_TOKEN_JSON');
    }
    refreshToken = tokenJson.refresh_token;
  } catch (e: any) {
    throw new Error(`Failed to parse GMAIL_OAUTH_TOKEN_JSON: ${e.message}`);
  }

  // Exchange refresh_token → short-lived access_token
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientConfig.client_id,
      client_secret: clientConfig.client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (body.includes('invalid_grant')) {
      throw new Error(
        'Gmail OAuth failed: invalid_grant. Refresh token is expired or revoked. ' +
        'Re-run `npm run gmail-auth` to obtain a new refresh token.',
      );
    }
    throw new Error(`Gmail token exchange failed (${resp.status}): ${body}`);
  }

  const json = await resp.json() as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Gmail token exchange returned no access_token');
  }

  return { accessToken: json.access_token };
}

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

// ─── Subject parsing ───────────────────────────────────────────────────────────

type ApprovalKind = 'gaf' | 'pet';

type ParsedApprovalSubject = {
  kind: ApprovalKind;
  checkInDate: string;   // MM-DD-YYYY
  checkOutDate: string;  // MM-DD-YYYY
};

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

  const GAF_RE = /Monaco 2604 - GAF Request \((\d{2}-\d{2}-\d{4}) to (\d{2}-\d{2}-\d{4})\)/;
  const PET_RE = /Monaco 2604 - Pet Request \((\d{2}-\d{2}-\d{4}) to (\d{2}-\d{2}-\d{4})\)/;

  const gafMatch = subject.match(GAF_RE);
  if (gafMatch) {
    return { kind: 'gaf', checkInDate: gafMatch[1], checkOutDate: gafMatch[2] };
  }

  const petMatch = subject.match(PET_RE);
  if (petMatch) {
    return { kind: 'pet', checkInDate: petMatch[1], checkOutDate: petMatch[2] };
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

async function saveHistoryId(historyId: string): Promise<void> {
  const sb = supabaseAdmin();
  // gmail_listener_state has exactly one row with id = 'default' (singleton constraint).
  // The conflict key is the primary key `id`, and the email column is `email_address`.
  const { error } = await sb.from('gmail_listener_state').upsert(
    {
      id: 'default',
      email_address: 'kamehome.azurenorth@gmail.com',
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
  expectedStatus: BookingStatus;
}): Promise<{ id: string; [key: string]: any } | null> {
  const { data, error } = await supabaseAdmin()
    .from('guest_submissions')
    .select('*')
    .eq('check_in_date', params.checkInDate)
    .eq('check_out_date', params.checkOutDate)
    .eq('status', params.expectedStatus);

  if (error) throw new Error(`DB lookup failed: ${error.message}`);

  if (!data || data.length === 0) return null;

  if (data.length > 1) {
    const err = new Error(
      `Ambiguous: ${data.length} bookings match ${params.checkInDate} → ${params.checkOutDate} with status ${params.expectedStatus}`,
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
  // Test booking status is tracked via is_test_booking in the DB, not the storage path.
  const filename = `${params.bookingId}/${params.kind === 'gaf' ? 'approved-gaf' : 'approved-pet'}.pdf`;

  const { error } = await sb.storage.from(bucket).upload(filename, params.bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // Return the storage path (not signed URL — calendarService/emailService will handle access)
  const { data } = sb.storage.from(bucket).getPublicUrl(filename);
  return data?.publicUrl ?? filename;
}

// ─── Message processing ────────────────────────────────────────────────────────

async function processMessage(messageId: string, accessToken: string): Promise<{
  action: 'applied' | 'skipped' | 'failed';
  reason?: string;
  bookingId?: string;
  kind?: ApprovalKind;
}> {
  // 1. Fetch full message (format=full required to see payload.parts with attachments)
  const full = await getFullMessage(accessToken, messageId);
  const subject = getHeader(full.payload?.headers, 'Subject');

  console.log(`[gmail-listener] Message ${messageId.slice(0, 16)}… Subject: ${subject.slice(0, 80)}`);

  // 2. Parse subject
  const parsed = parseApprovalSubject(subject);
  if (!parsed) {
    return { action: 'skipped', reason: 'subject_no_match', kind: 'gaf' };
  }

  // 3. Find APPROVED GAF.pdf attachment
  const attachments: AttachmentInfo[] = [];
  collectAttachmentParts(full.payload, attachments);

  const approvedPdf = attachments.find(
    (a) => a.filename.toLowerCase() === 'approved gaf.pdf',
  );

  if (!approvedPdf) {
    return { action: 'skipped', reason: 'no_approved_gaf_pdf_attachment', kind: parsed.kind };
  }

  console.log(`[gmail-listener] Found approval (${parsed.kind}): ${parsed.checkInDate} → ${parsed.checkOutDate}`);

  // 4. Determine expected status for the DB lookup
  const expectedStatus: BookingStatus =
    parsed.kind === 'gaf' ? 'PENDING_GAF' : 'PENDING_PET_REQUEST';

  // 5. Find the booking
  let booking: { id: string; [key: string]: any } | null;
  try {
    booking = await findBookingForApproval({
      checkInDate: parsed.checkInDate,
      checkOutDate: parsed.checkOutDate,
      expectedStatus,
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
      `[gmail-listener] No ${expectedStatus} booking found for dates ${parsed.checkInDate} → ${parsed.checkOutDate}`,
    );
    return { action: 'skipped', reason: `no_booking_found_for_${expectedStatus}`, kind: parsed.kind };
  }

  const bookingId = booking.id as string;

  // 6. Download attachment bytes
  const bytes = await downloadAttachment(accessToken, messageId, approvedPdf.attachmentId);
  console.log(`[gmail-listener] Downloaded ${bytes.length} bytes for booking ${bookingId}`);

  // 7. Upload to Supabase Storage
  const pdfUrl = await uploadApprovedPdf({ kind: parsed.kind, bookingId, bytes });
  console.log(`[gmail-listener] Uploaded PDF → ${pdfUrl}`);

  // 8. Determine next status
  let toStatus: BookingStatus;
  const payload: Record<string, any> = {};

  if (parsed.kind === 'gaf') {
    payload.approved_gaf_pdf_url = pdfUrl;
    // Next state depends on booking's parking/pet flags
    if (booking.need_parking) {
      toStatus = 'PENDING_PARKING_REQUEST';
    } else if (booking.has_pets) {
      toStatus = 'PENDING_PET_REQUEST';
    } else {
      toStatus = 'READY_FOR_CHECKIN';
    }
  } else {
    // pet approval
    payload.approved_pet_pdf_url = pdfUrl;
    toStatus = 'READY_FOR_CHECKIN';
  }

  console.log(`[gmail-listener] Transitioning booking ${bookingId}: ${expectedStatus} → ${toStatus}`);

  // 9. Call orchestrator (no dev controls — listener runs all side effects)
  await WorkflowOrchestrator.transition(
    bookingId,
    toStatus,
    payload,
    {
      saveToDatabase: true,
      updateGoogleCalendar: true,
      updateGoogleSheets: true,
      sendGafRequestEmail: false,          // GAF/pet emails already sent; don't resend
      sendParkingBroadcastEmail: false,    // parking broadcast already sent
      sendPetRequestEmail: false,          // pet request already sent
      sendBookingAcknowledgementEmail: false, // already sent at PENDING_GAF step
      sendReadyForCheckinEmail: toStatus === 'READY_FOR_CHECKIN', // only send if going to READY
    },
    false, // manual=false — listener-driven transition
  );

  return { action: 'applied', bookingId, kind: parsed.kind };
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
      ({ accessToken } = await getGmailAccessToken());
    } catch (e: any) {
      console.error('[gmail-listener] OAuth failed:', e.message);
      // Return 200 so cron doesn't alarm — the error is logged; ops must re-auth
      return new Response(
        JSON.stringify({ success: false, error: e.message, needsReAuth: e.message.includes('invalid_grant') }),
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
      return new Response(
        JSON.stringify({ success: true, messagesScanned: 0, applied: 0 }),
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

    const summary = {
      success: true,
      messagesScanned: addedMessageIds.length,
      applied,
      skipped,
      failed,
      historyId: newHistoryId,
      results,
    };

    console.log('[gmail-listener] Run complete:', JSON.stringify({ applied, skipped, failed }));

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
