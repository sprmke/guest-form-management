/**
 * Admin-triggered booking AI summary & validation.
 *
 * Runs 3 batched Gemini vision calls per full booking (guest IDs, pet docs, receipt)
 * plus one non-AI stay-details section. Results are stored in `booking_ai_reviews`.
 *
 * Conventions:
 * - Prompts are hand-written JSON instructions; we regex-extract JSON then parse.
 * - No Zod; we normalize and clamp outputs defensively.
 * - Completed jobs are not re-run (UI + `booking-ai-review` both refuse a second pass).
 * - Stuck / failed first attempts may retry; section fingerprints skip AI when inputs are unchanged.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import {
  extractGeminiUsage,
  getGeminiApiKeys,
  getGroqApiKey,
  nextGeminiKeyStartIndex,
  providerError,
  shouldTryNextProvider,
} from './aiGeminiKeys.ts';
import { geminiGenerateContentUrl, getModelConfig, type AiFeature } from './aiModelRouter.ts';
import {
  assertOrgAiQuotaOptional,
  type AiQuotaExceededError,
  type AiPlatformDisabledError,
  recordAiUsageOptional,
} from './aiUsageService.ts';
import { DatabaseService } from './databaseService.ts';
import { parseStorageUrl } from './receiptValidationService.ts';
import {
  countStayNights,
  formatTime,
  formatTimeForDisplay,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from './utils.ts';

export type AiReviewSectionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type AiReviewFlagSeverity = 'info' | 'warning' | 'blocking';

export type AiReviewFlag = {
  message: string;
  severity: AiReviewFlagSeverity;
};

export type AiReviewSectionResult = {
  summary: string;
  flags: AiReviewFlag[];
  fingerprint: string;
  reused: boolean;
  updated_at: string;
};

export type BookingAiReviewSection = 'stay_details' | 'guests' | 'parking' | 'pets' | 'pricing';

export type BookingAiReviewJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type BookingAiReviewRow = {
  id?: string;
  booking_id: string;
  property_id?: string | null;
  job_status: BookingAiReviewJobStatus;
  stay_details_status: AiReviewSectionStatus;
  guests_status: AiReviewSectionStatus;
  parking_status: AiReviewSectionStatus;
  pets_status: AiReviewSectionStatus;
  pricing_status: AiReviewSectionStatus;
  stay_details_result?: AiReviewSectionResult | null;
  guests_result?: AiReviewSectionResult | null;
  parking_result?: AiReviewSectionResult | null;
  pets_result?: AiReviewSectionResult | null;
  pricing_result?: AiReviewSectionResult | null;
  flag_count: number;
  has_blocking_flag: boolean;
  triggered_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AiUsageContext = {
  organizationId: string;
  propertyId?: string | null;
};

export const AI_SUMMARY_STYLE_GUIDE = `Style guide (strict):
- Write terse operations notes, not conversational sentences.
- Maximum 100 characters per summary sentence.
- State facts directly. Never use "It appears", "It seems", "I can see", "I think", "may be", or similar hedging.
- When a file fails the check, name it, say what's wrong in plain words, then end with "Please review." Do not use an em dash (—) or a "verdict: reason" shape.
- Write for a host with no technical background: plain words, no jargon, no verdict codes ("invalid", "unclear"), no mention of AI or models.
- Always name the document you checked. Never start with bare "Image", "Images", "Photo", "Photos", "File", or "Document".
- Example good: "Downpayment receipt shows ₱3,500 GCash transfer."
- Example good: "Pet photo shows a payment receipt, not a pet."
- Example good: "Guest 1 ID uploaded, but the file is too unclear to confirm. Please review."
- Example bad: "Images show payment receipts, not a pet."
- Example bad: "Image displays Payment Receipt and date."
- Example bad: "It appears this may be a valid receipt."
- Example bad: "Guest 1 ID uploaded — needs review: too unclear to verify."
- Example bad: "Verdict: unclear."`;

/**
 * Vague model openings ("Images show…") → named document ("Pet photo shows…")
 * so the host knows which uploaded file the note is about.
 */
export function clarifyDocumentSubject(text: string, subject: string): string {
  let out = text.trim();
  const label = subject.trim();
  if (!out || !label) return out;

  // Always rewrite hedges → conclusive "needs review", even when the note already
  // opens with the document name (early-return below would otherwise skip them).
  out = rewriteNeedsReviewWording(out, label);

  if (new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(out)) {
    return out;
  }

  const plural = /\bfiles\b/i.test(label) || /\band\b/i.test(label);
  const withVerb = (base: 'show' | 'display' | 'contain') =>
    plural ? `${label} ${base}` : `${label} ${base}s`;

  out = out.replace(
    /^(?:The\s+)?(?:uploaded\s+)?(?:images?|photos?|pictures?|files?|documents?|scans?)\s+(show|shows|display|displays|contain|contains|is|are)\b/i,
    (_m, verb: string) => {
      const v = String(verb).toLowerCase();
      if (v === 'show' || v === 'shows') return withVerb('show');
      if (v === 'display' || v === 'displays') return withVerb('display');
      if (v === 'contain' || v === 'contains') return withVerb('contain');
      return plural ? `${label} are` : `${label} is`;
    }
  );

  out = out.replace(/^(?:The\s+)?image\s+(shows|displays|contains)\b/i, (_m, verb: string) => {
    const v = String(verb).toLowerCase();
    if (v.startsWith('show')) return withVerb('show');
    if (v.startsWith('display')) return withVerb('display');
    return withVerb('contain');
  });

  out = out.replace(
    /^No pet photo or vaccination record present\.?$/i,
    `${label} uploaded, but neither shows a pet or a vaccination record.`
  );
  out = out.replace(
    /^Cannot verify parking amount: no receipt amount extracted\.?$/i,
    'Downpayment receipt uploaded, but no amount could be read, so the parking fee is unverified.'
  );

  return out;
}

/** Legacy verdict leftovers (including the earlier em-dash form) → the plain note. */
function rewriteNeedsReviewWording(text: string, label: string): string {
  let out = text;
  out = out.replace(/^Pet documents marked (invalid|unclear)\.?$/i, (_m, verdict: string) =>
    needsReviewText(label, verdict.toLowerCase() as 'invalid' | 'unclear')
  );
  out = out.replace(/^Receipt marked (invalid|unclear)\.?$/i, (_m, verdict: string) =>
    needsReviewText('Downpayment receipt', verdict.toLowerCase() as 'invalid' | 'unclear')
  );
  out = out.replace(
    /^(.+?)\s+uploaded\s+—\s+needs review:\s+too unclear to verify\.?$/i,
    (_m, subject: string) => needsReviewText(subject.trim(), 'unclear')
  );
  out = out.replace(
    /^(.+?)\s+uploaded\s+—\s+needs review:\s+not a valid document\.?$/i,
    (_m, subject: string) => needsReviewText(subject.trim(), 'invalid')
  );
  out = out.replace(
    /^(.+?)\s+uploaded,\s+but\s+the\s+(?:photo|image|file)\s+is\s+too\s+unclear\s+to\s+confirm\.?$/i,
    (_m, subject: string) => needsReviewText(subject.trim(), 'unclear')
  );
  out = out.replace(
    /^(.+?)\s+uploaded,\s+but\s+the\s+(?:photo|image|file)\s+does\s+not\s+show\s+what\s+was\s+asked\s+for\.?$/i,
    (_m, subject: string) => needsReviewText(subject.trim(), 'invalid')
  );
  return out;
}

function clarifyFlags(flags: AiReviewFlag[], subject: string): AiReviewFlag[] {
  return flags.map((item) => ({
    ...item,
    message: clarifyDocumentSubject(item.message, subject),
  }));
}

const SECTIONS: BookingAiReviewSection[] = ['stay_details', 'guests', 'pricing', 'parking', 'pets'];

function sectionStatusColumn(section: BookingAiReviewSection): string {
  return `${section}_status`;
}

function sectionResultColumn(section: BookingAiReviewSection): string {
  return `${section}_result`;
}

export function emptyBookingAiReviewRow(bookingId: string): BookingAiReviewRow {
  return {
    booking_id: bookingId,
    job_status: 'pending',
    stay_details_status: 'pending',
    guests_status: 'pending',
    parking_status: 'pending',
    pets_status: 'pending',
    pricing_status: 'pending',
    flag_count: 0,
    has_blocking_flag: false,
  };
}

function supabaseService() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function normalizeVisionMimeType(mimeType: string, path?: string): string {
  if (mimeType?.startsWith('image/')) return mimeType;
  if (mimeType === 'application/pdf') return mimeType;
  return mimeTypeFromPath(path ?? '');
}

export async function computeSectionFingerprint(inputs: unknown): Promise<string> {
  const canonical = JSON.stringify(inputs, Object.keys(inputs as object).sort());
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonical));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Truncates on a word boundary. A mid-word cut ("Not transaction proo") reads as a
 * typo in the host's note, not as a truncation.
 */
function clampSummary(text: string, max = 150): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  const head = trimmed.slice(0, max - 1);
  const lastBreak = head.lastIndexOf(' ');
  const body = lastBreak > Math.floor(max * 0.5) ? head.slice(0, lastBreak) : head;
  return `${body.replace(/[\s,;:.…–—-]+$/u, '')}…`;
}

/** Trims a trailing partial sentence so the note ends on a complete thought. */
function trimToLastSentence(text: string, minKeep = 40): string {
  const trimmed = text.trim();
  if (/[.!?…]$/u.test(trimmed)) return trimmed;
  const lastStop = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('? ')
  );
  if (lastStop >= minKeep) return trimmed.slice(0, lastStop + 1);
  return trimmed;
}

function isBlankUrl(url: string | null | undefined): boolean {
  return !url || url === 'dev-mode-skipped' || url === 'test-mode-skipped';
}

function normalizeVerdict(raw: unknown): 'valid' | 'likely_valid' | 'unclear' | 'invalid' {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'valid' || v === 'likely_valid' || v === 'unclear' || v === 'invalid') return v;
  return 'unclear';
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pesoMoney(value: number | null): string {
  if (value === null) return '—';
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function flag(message: string, severity: AiReviewFlagSeverity = 'warning'): AiReviewFlag {
  return { message: message.slice(0, 200), severity };
}

/**
 * Document flags always answer "is the file here?" first — a host reading
 * "cannot verify amount" otherwise can't tell whether to chase the guest for an
 * upload or re-read a file that is already on record.
 */
function missingFileFlag(label: string, severity: AiReviewFlagSeverity = 'warning'): AiReviewFlag {
  return flag(`${label} not uploaded yet.`, severity);
}

function uploadedFileFlag(
  label: string,
  issue: string,
  severity: AiReviewFlagSeverity = 'warning'
): AiReviewFlag {
  return flag(`${label} uploaded, but ${issue}`, severity);
}

/**
 * Plain host note for invalid/unclear verdicts: name the file, say what's wrong in
 * conversational words, then ask for a review. No em dash or colon "verdict: reason"
 * shape, which reads as machine output rather than a note a host would write.
 */
function needsReviewText(label: string, verdict: 'unclear' | 'invalid'): string {
  return verdict === 'invalid'
    ? `${label} uploaded, but the file does not look like a valid document. Please review.`
    : `${label} uploaded, but the file is too unclear to confirm. Please review.`;
}

function uploadedNeedsReviewFlag(
  label: string,
  verdict: 'unclear' | 'invalid',
  severity: AiReviewFlagSeverity = 'warning'
): AiReviewFlag {
  return flag(needsReviewText(label, verdict), severity);
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isProviderErrorMessage(message: string): boolean {
  return /gemini api error|groq api error|models\/gemini|no longer available|quota exceeded|all gemini keys exhausted/i.test(
    message
  );
}

function sectionFailureSummary(section: BookingAiReviewSection): string {
  switch (section) {
    case 'stay_details':
      return 'Stay details could not be checked.';
    case 'guests':
      return 'Guest IDs could not be checked.';
    case 'parking':
      return 'Parking could not be checked.';
    case 'pets':
      return 'Pet documents could not be checked.';
    case 'pricing':
      return 'Downpayment receipt could not be checked.';
    default:
      return 'This check could not complete.';
  }
}

function userFacingSectionFailure(
  section: BookingAiReviewSection,
  err: Error
): AiReviewSectionResult {
  const summary = sectionFailureSummary(section);
  const flags: AiReviewFlag[] = isProviderErrorMessage(err.message)
    ? [flag('Try again in a moment.', 'warning')]
    : [flag(summary, 'warning')];
  return buildSectionResult(summary, flags, '', false);
}

function buildSectionResult(
  summary: string,
  flags: AiReviewFlag[],
  fingerprint: string,
  reused: boolean
): AiReviewSectionResult {
  return {
    summary: clampSummary(summary),
    flags,
    fingerprint,
    reused,
    updated_at: nowIso(),
  };
}

async function downloadStorageFile(url: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
  path: string;
} | null> {
  const loc = parseStorageUrl(url);
  if (!loc) return null;
  const supabase = supabaseService();
  const { data, error } = await supabase.storage.from(loc.bucket).download(loc.path);
  if (error || !data) {
    console.error('[bookingAiReview] download failed:', error?.message);
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const mimeType =
    data.type?.startsWith('image/') || data.type === 'application/pdf'
      ? data.type
      : mimeTypeFromPath(loc.path);
  return { bytes, mimeType: normalizeVisionMimeType(mimeType, loc.path), path: loc.path };
}

type VisionImage = { bytes: Uint8Array; mimeType: string; label: string };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_SUPPORTED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

async function recordVisionUsage(
  feature: AiFeature,
  provider: 'gemini' | 'groq',
  tokenUsage: { inputTokens: number; outputTokens: number } | null,
  usageContext: AiUsageContext | null
): Promise<void> {
  if (!usageContext?.organizationId) return;
  const config = getModelConfig(feature);
  await recordAiUsageOptional(usageContext.organizationId, {
    propertyId: usageContext.propertyId ?? null,
    feature,
    provider,
    model: provider === 'gemini' ? config.model : GROQ_MODEL,
    inputTokens: tokenUsage?.inputTokens,
    outputTokens: tokenUsage?.outputTokens,
  });
}

async function callGeminiBatched(
  feature: AiFeature,
  prompt: string,
  images: VisionImage[],
  usageContext: AiUsageContext | null,
  logTag: string
): Promise<string> {
  await assertOrgAiQuotaOptional(usageContext?.organizationId);

  const geminiKeys = getGeminiApiKeys();
  const groqKey = getGroqApiKey();
  const config = getModelConfig(feature);
  const geminiUrl = geminiGenerateContentUrl(config.model);

  if (geminiKeys.length === 0 && !groqKey) {
    throw new Error('No AI API keys configured');
  }

  if (geminiKeys.length > 0) {
    const start = nextGeminiKeyStartIndex(geminiKeys.length);
    for (let i = 0; i < geminiKeys.length; i++) {
      const key = geminiKeys[(start + i) % geminiKeys.length];
      try {
        const res = await fetch(`${geminiUrl}?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  ...images.map((img) => ({
                    inline_data: {
                      mime_type: img.mimeType,
                      data: bytesToBase64(img.bytes),
                    },
                  })),
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          if (shouldTryNextProvider(res.status)) {
            console.warn(`[${logTag}] Gemini key exhausted (${res.status}), trying next...`);
            continue;
          }
          throw new Error(
            `Gemini API error ${res.status}: ${providerError(JSON.parse(errText || '{}'), errText.slice(0, 200))}`
          );
        }

        const body = await res.json();
        const text =
          (
            body as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            }
          ).candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        await recordVisionUsage(feature, 'gemini', extractGeminiUsage(body), usageContext);
        return text;
      } catch (err) {
        if (err instanceof Error && /quota exceeded/i.test(err.message)) {
          console.warn(`[${logTag}] Gemini quota exceeded, trying next key...`);
          continue;
        }
        if (i === geminiKeys.length - 1) throw err;
        console.warn(`[${logTag}] Gemini key threw: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.warn(`[${logTag}] All Gemini keys exhausted, trying Groq fallback...`);
  }

  if (groqKey) {
    const unsupported = images.some((img) => !GROQ_SUPPORTED_MIME.has(img.mimeType));
    if (!unsupported) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  ...images.map((img) => ({
                    type: 'image_url',
                    image_url: { url: `data:${img.mimeType};base64,${bytesToBase64(img.bytes)}` },
                  })),
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 512,
            response_format: { type: 'json_object' },
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 200)}`);
        }
        const body = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        await recordVisionUsage(feature, 'groq', null, usageContext);
        return body.choices?.[0]?.message?.content ?? '';
      } catch (err) {
        console.error(`[${logTag}] Groq fallback failed:`, err);
        throw err;
      }
    }
  }

  throw new Error('All AI providers exhausted');
}

function normalizeDateToYmd(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [m, d, y] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

function minutesBetweenTimes(prevTime: string, nextTime: string): number {
  const a = formatTime(prevTime) || DEFAULT_CHECK_OUT_TIME;
  const b = formatTime(nextTime) || DEFAULT_CHECK_IN_TIME;
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  if (Number.isNaN(ah) || Number.isNaN(bh)) return 0;
  return bh * 60 + bm - (ah * 60 + am);
}

export async function computeStayDetailsSection(
  booking: Record<string, unknown>,
  propertyId: string | null | undefined,
  existingRow?: BookingAiReviewRow | null
): Promise<AiReviewSectionResult> {
  const checkIn = normalizeDateToYmd(booking.check_in_date);
  const checkOut = normalizeDateToYmd(booking.check_out_date);
  const checkInTime = String(booking.check_in_time || DEFAULT_CHECK_IN_TIME);
  const checkOutTime = String(booking.check_out_time || DEFAULT_CHECK_OUT_TIME);

  const inputs = {
    check_in_date: checkIn,
    check_out_date: checkOut,
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    property_id: propertyId,
    guest_requests_surprise_decor: !!booking.guest_requests_surprise_decor,
    guest_special_requests: String(booking.guest_special_requests || ''),
  };
  const fingerprint = await computeSectionFingerprint(inputs);

  const existing = existingRow?.stay_details_result;
  if (existing && existing.fingerprint === fingerprint) {
    return buildSectionResult(existing.summary, existing.flags, fingerprint, true);
  }

  const { hasOverlap, overlappingBookings } = await DatabaseService.checkOverlappingBookings(
    String(booking.check_in_date),
    String(booking.check_out_date),
    String(booking.id || ''),
    propertyId ?? undefined
  );

  const adjacent = await DatabaseService.getAdjacentBookings(
    String(booking.check_in_date),
    String(booking.check_out_date),
    String(booking.id || ''),
    propertyId ?? undefined
  );

  const flags: AiReviewFlag[] = [];
  const checkInLabel = formatTimeForDisplay(checkInTime, checkInTime);
  const checkOutLabel = formatTimeForDisplay(checkOutTime, checkOutTime);
  let summary = `${pluralize(countStayNights(checkIn, checkOut), 'night')} · check-in ${checkInLabel} · check-out ${checkOutLabel}.`;

  if (hasOverlap) {
    const names = overlappingBookings.map((b) => b.primary_guest_name).filter(Boolean);
    flags.push(
      flag(
        names.length
          ? `These dates clash with an existing booking (${names.join(', ')}).`
          : 'These dates clash with an existing booking.',
        'blocking'
      )
    );
    summary = 'These dates overlap another booking.';
  }

  for (const ab of adjacent) {
    const isPrevious = ab.check_out_date === checkIn;
    const isNext = ab.check_in_date === checkOut;
    if (isPrevious) {
      const previousCheckOut = ab.check_out_time || DEFAULT_CHECK_OUT_TIME;
      const previousLabel = formatTimeForDisplay(previousCheckOut, previousCheckOut);
      const gapMinutes = minutesBetweenTimes(previousCheckOut, checkInTime);
      if (gapMinutes < 0) {
        flags.push(
          flag(
            `Check-in ${checkInLabel} starts before the previous guest checks out at ${previousLabel}.`,
            'blocking'
          )
        );
      } else if (gapMinutes < 120) {
        flags.push(
          flag(
            `Only ${gapMinutes} min to clean — previous guest checks out at ${previousLabel}.`,
            'warning'
          )
        );
      }
    }
    if (isNext) {
      const nextCheckIn = ab.check_in_time || DEFAULT_CHECK_IN_TIME;
      const nextLabel = formatTimeForDisplay(nextCheckIn, nextCheckIn);
      const gapMinutes = minutesBetweenTimes(checkOutTime, nextCheckIn);
      if (gapMinutes < 0) {
        flags.push(
          flag(
            `Check-out ${checkOutLabel} runs past the next guest's check-in at ${nextLabel}.`,
            'blocking'
          )
        );
      } else if (gapMinutes < 120) {
        flags.push(
          flag(
            `Only ${gapMinutes} min to clean before the next check-in at ${nextLabel}.`,
            'warning'
          )
        );
      }
    }
  }

  if (booking.guest_requests_surprise_decor) {
    flags.push(flag('Guest requested surprise decor / setup.', 'info'));
  }

  const specialRequests = String(booking.guest_special_requests || '').trim();
  if (specialRequests) {
    flags.push(flag(`Special request: “${clampSummary(specialRequests, 160)}”`, 'info'));
  }

  return buildSectionResult(summary, flags, fingerprint, false);
}

type GuestSlotInfo = {
  slot: number;
  field: string;
  dbVerdict: string;
  dbSummary: string;
  typedName: string;
  typedAge: number | null;
  typedNationality: string;
  url: string | null;
};

function buildGuestSlots(booking: Record<string, unknown>): GuestSlotInfo[] {
  const slots: GuestSlotInfo[] = [
    {
      slot: 1,
      field: 'valid_id',
      dbVerdict: 'valid_id_ai_verdict',
      dbSummary: 'valid_id_ai_summary',
      typedName: String(booking.primary_guest_name || ''),
      typedAge: coerceNumber(booking.primary_guest_age),
      typedNationality: String(booking.nationality || ''),
      url: (booking.valid_id_url as string | null) || null,
    },
  ];
  for (let i = 2; i <= 5; i++) {
    const name = String(booking[`guest${i}_name`] || '').trim();
    const age = coerceNumber(booking[`guest${i}_age`]);
    const url = (booking[`guest${i}_valid_id_url`] as string | null) || null;
    if (name || url) {
      slots.push({
        slot: i,
        field: `guest${i}_valid_id`,
        dbVerdict: `guest${i}_valid_id_ai_verdict`,
        dbSummary: `guest${i}_valid_id_ai_summary`,
        typedName: name,
        typedAge: age,
        typedNationality: String(booking.nationality || ''),
        url,
      });
    }
  }
  return slots;
}

function nameLooksSimilar(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  const aa = normalize(a);
  const bb = normalize(b);
  if (!aa || !bb) return true;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function isFilipino(nationality: string): boolean {
  return /filipino|philippine|pinoy/i.test(nationality);
}

const GUEST_ID_PROMPT = `You are extracting data from guest valid ID images for a vacation rental booking in the Philippines.
${AI_SUMMARY_STYLE_GUIDE}
Analyze each labeled image and return ONLY valid JSON with this exact shape:
{
  "slots": [
    {
      "slot": 1,
      "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
      "extracted_name": "full name from ID",
      "extracted_age": number | null,
      "extracted_nationality": "nationality/country from ID",
      "summary": "one short ops note"
    }
  ]
}
One object per image, in the same order as the labels shown.
Rules:
- "valid": clear government-issued photo ID with name and/or photo visible.
- "likely_valid": ID appears genuine but blurry/cropped/glare.
- "unclear": too ambiguous to tell if it is an ID.
- "invalid": clearly NOT an ID.
- If a value is unreadable, use null (not empty string).
- extracted_age is the person's age in years; derive from birth date if visible, otherwise null.
- summary max 100 characters, no hedging, state the ID type and any mismatch risk.
- Every summary must start with "Guest N ID" (matching the image label). Never say "Image" or "Images" alone.
- Example good: "Guest 1 ID shows a clear driver's license."
- Example bad: "Image displays a blurred card."`;

export async function runGuestsSection(
  booking: Record<string, unknown>,
  usageContext: AiUsageContext | null,
  existingRow?: BookingAiReviewRow | null
): Promise<{
  result: AiReviewSectionResult;
  persistPatch: Record<string, string>;
}> {
  const slots = buildGuestSlots(booking);
  const activeSlots = slots.filter((s) => !isBlankUrl(s.url));
  const skippedSlots = slots.filter((s) => isBlankUrl(s.url) && s.typedName);

  const inputs = activeSlots.map((s) => ({
    slot: s.slot,
    url: s.url,
    typed_name: s.typedName,
    typed_age: s.typedAge,
    typed_nationality: s.typedNationality,
  }));
  const fingerprint = await computeSectionFingerprint(inputs);

  const existingResult = existingRow?.guests_result;
  if (existingResult?.fingerprint === fingerprint) {
    const reused = buildSectionResult(
      existingResult.summary,
      existingResult.flags,
      fingerprint,
      true
    );
    reused.updated_at = nowIso();
    return { result: reused, persistPatch: {} };
  }

  /** Per-guest so the host knows exactly whose ID to chase. */
  const missingIdFlags = (): AiReviewFlag[] =>
    skippedSlots
      .filter((s) => (s.typedAge ?? 18) >= 18)
      .map((s) => missingFileFlag(`Guest ${s.slot} ID`));

  if (activeSlots.length === 0) {
    return {
      result: buildSectionResult('No guest ID uploaded yet.', missingIdFlags(), fingerprint, false),
      persistPatch: {},
    };
  }

  const images: VisionImage[] = [];
  for (const slot of activeSlots) {
    const file = await downloadStorageFile(slot.url as string);
    if (!file) {
      continue;
    }
    images.push({
      bytes: file.bytes,
      mimeType: file.mimeType,
      label: `Guest ${slot.slot}`,
    });
  }

  if (images.length === 0) {
    return {
      result: buildSectionResult(
        activeSlots.length === 1
          ? 'Guest ID is on file but could not be opened.'
          : `${activeSlots.length} guest IDs are on file but none could be opened.`,
        [uploadedFileFlag('Guest IDs', 'the files could not be opened — re-upload may be needed.')],
        fingerprint,
        false
      ),
      persistPatch: {},
    };
  }

  const prompt = `${GUEST_ID_PROMPT}\n\nGuest labels: ${images.map((img, idx) => `${img.label} (image ${idx + 1})`).join(', ')}`;
  const rawText = await callGeminiBatched(
    'booking_ai_summary_guests',
    prompt,
    images,
    usageContext,
    'booking-ai-guests'
  );

  const parsed = parseJsonObject(rawText);
  const slotsArray = Array.isArray(parsed?.slots) ? (parsed?.slots as unknown[]) : [];

  const persistPatch: Record<string, string> = {};
  const flags: AiReviewFlag[] = [];
  let needsReviewCount = 0;

  for (let i = 0; i < activeSlots.length; i++) {
    const slot = activeSlots[i];
    const slotRaw = slotsArray[i] as Record<string, unknown> | undefined;
    const verdict = normalizeVerdict(slotRaw?.verdict);
    const extractedName = String(slotRaw?.extracted_name || '').trim();
    const extractedAge = coerceNumber(slotRaw?.extracted_age);
    const extractedNationality = String(slotRaw?.extracted_nationality || '').trim();
    const summary = clampSummary(
      clarifyDocumentSubject(
        String(slotRaw?.summary || `Guest ${slot.slot} ID uploaded. Please review.`),
        `Guest ${slot.slot} ID`
      )
    );

    persistPatch[slot.dbVerdict] = verdict;
    persistPatch[slot.dbSummary] = summary;

    const idLabel = `Guest ${slot.slot} ID`;

    if (
      slot.typedAge !== null &&
      extractedAge !== null &&
      Math.abs(slot.typedAge - extractedAge) > 2
    ) {
      flags.push(
        uploadedFileFlag(
          idLabel,
          `it shows age ${extractedAge} while the form says ${slot.typedAge}.`
        )
      );
    }
    if (slot.typedAge !== null && slot.typedAge < 18) {
      flags.push(flag(`Guest ${slot.slot} is a minor (age ${slot.typedAge}).`, 'warning'));
    }
    if (extractedNationality && !isFilipino(extractedNationality)) {
      flags.push(flag(`${idLabel} shows nationality ${extractedNationality}.`, 'info'));
    }
    if (slot.typedName && extractedName && !nameLooksSimilar(slot.typedName, extractedName)) {
      flags.push(
        uploadedFileFlag(
          idLabel,
          `the name reads “${extractedName}” while the form says “${slot.typedName}”.`
        )
      );
    }
    if (verdict === 'invalid' || verdict === 'unclear') {
      needsReviewCount += 1;
      flags.push(uploadedNeedsReviewFlag(idLabel, verdict));
    }
  }

  flags.push(...missingIdFlags());

  const summaryParts = [`${pluralize(activeSlots.length, 'ID')} uploaded`];
  summaryParts.push(
    needsReviewCount > 0
      ? `${needsReviewCount} need${needsReviewCount === 1 ? 's' : ''} review`
      : 'all readable'
  );
  if (skippedSlots.length > 0) {
    summaryParts.push(`${pluralize(skippedSlots.length, 'guest')} with no ID yet`);
  }

  return {
    result: buildSectionResult(`${summaryParts.join(' · ')}.`, flags, fingerprint, false),
    persistPatch,
  };
}

const PET_PROMPT = `You are reviewing a pet image and vaccination record for a vacation rental in the Philippines.
${AI_SUMMARY_STYLE_GUIDE}
Analyze the labeled images and return ONLY valid JSON:
{
  "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
  "summary": "one short ops note",
  "flags": ["concise note 1", "concise note 2"]
}
Rules:
- "valid": clear pet photo and a vaccination record with recognizable pet name/type and dates.
- "likely_valid": documents are partially unclear but appear genuine.
- "unclear": cannot confirm either pet or vaccination.
- "invalid": photos are not of a pet or not a vaccination record.
- Keep each flag under 80 characters; no hedging.
- Always name the file(s): start with "Pet photo", "Vaccination record", or "Pet photo and vaccination record".
- Never say bare "Images" / "Image" / "Photos" / "Documents".
- Example good: "Pet photo shows a payment receipt, not a pet."
- Example bad: "Images show payment receipts, not pet photo."`;

export async function runPetsSection(
  booking: Record<string, unknown>,
  usageContext: AiUsageContext | null,
  existingRow?: BookingAiReviewRow | null
): Promise<AiReviewSectionResult> {
  const hasPets = booking.has_pets === true || String(booking.has_pets) === 'true';
  if (!hasPets) {
    const fp = await computeSectionFingerprint({ has_pets: false });
    return buildSectionResult('No pets.', [], fp, existingRow?.pets_result?.fingerprint === fp);
  }

  const petImageUrl = String(booking.pet_image_url || '');
  const petVaccinationUrl = String(booking.pet_vaccination_url || '');
  const inputs = { pet_image_url: petImageUrl, pet_vaccination_url: petVaccinationUrl };
  const fingerprint = await computeSectionFingerprint(inputs);

  if (existingRow?.pets_result?.fingerprint === fingerprint) {
    const reused = buildSectionResult(
      existingRow.pets_result.summary,
      existingRow.pets_result.flags,
      fingerprint,
      true
    );
    reused.updated_at = nowIso();
    return reused;
  }

  const images: VisionImage[] = [];
  if (!isBlankUrl(petImageUrl)) {
    const file = await downloadStorageFile(petImageUrl);
    if (file) images.push({ bytes: file.bytes, mimeType: file.mimeType, label: 'Pet photo' });
  }
  if (!isBlankUrl(petVaccinationUrl)) {
    const file = await downloadStorageFile(petVaccinationUrl);
    if (file)
      images.push({ bytes: file.bytes, mimeType: file.mimeType, label: 'Vaccination record' });
  }

  // Named individually — "pet documents missing" leaves the host guessing which one.
  const missingPetFlags: AiReviewFlag[] = [];
  if (isBlankUrl(petImageUrl)) missingPetFlags.push(missingFileFlag('Pet photo'));
  if (isBlankUrl(petVaccinationUrl)) missingPetFlags.push(missingFileFlag('Vaccination record'));

  if (images.length === 0) {
    return buildSectionResult(
      'Pet photo and vaccination record not uploaded yet.',
      missingPetFlags,
      fingerprint,
      false
    );
  }

  const rawText = await callGeminiBatched(
    'booking_ai_summary_pets',
    PET_PROMPT,
    images,
    usageContext,
    'booking-ai-pets'
  );

  const parsed = parseJsonObject(rawText);
  const verdict = normalizeVerdict(parsed?.verdict);
  const uploadedLabels = images.map((img) => img.label).join(' and ');
  const petSubject =
    images.length === 2
      ? 'Pet photo and vaccination record'
      : images[0]?.label === 'Vaccination record'
        ? 'Vaccination record'
        : 'Pet photo';
  const summary = trimToLastSentence(
    clampSummary(
      clarifyDocumentSubject(
        String(parsed?.summary || `${petSubject} uploaded. Please review.`),
        petSubject
      )
    )
  );
  const rawFlags = Array.isArray(parsed?.flags) ? (parsed?.flags as unknown[]) : [];
  const flags: AiReviewFlag[] = clarifyFlags(
    rawFlags
      .map((f) => flag(clampSummary(String(f), 120), verdict === 'invalid' ? 'warning' : 'info'))
      .filter(Boolean),
    petSubject
  );
  if (verdict === 'invalid' || verdict === 'unclear') {
    flags.push(uploadedNeedsReviewFlag(uploadedLabels, verdict));
  }
  flags.push(...missingPetFlags);

  return buildSectionResult(summary, flags, fingerprint, false);
}

const PRICING_PROMPT = `You are validating a downpayment receipt for a vacation rental booking in the Philippines.
${AI_SUMMARY_STYLE_GUIDE}
Analyze the image and return ONLY valid JSON:
{
  "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
  "summary": "one short ops note",
  "extracted_amount": number | null,
  "amount_confidence": "high" | "medium" | "low" | null
}
Rules:
- "valid": clear digital transfer receipt/screenshot or clear photo of PHP cash bills.
- "likely_valid": recognizable payment proof but partly blurry/cropped.
- "unclear": cannot confirm it is payment proof.
- "invalid": clearly not payment proof.
- extracted_amount is the numeric Philippine peso amount visible. Ignore fees and unrelated numbers.
- amount_confidence: high when the amount is clearly visible, medium/low otherwise.
- summary max 100 characters; always start with "Downpayment receipt".
- Never say bare "Image" / "Images" / "Receipt" without "Downpayment".
- Example good: "Downpayment receipt shows ₱3,500 GCash transfer."
- Example bad: "Image displays Payment Receipt and date."`;

export async function runPricingSection(
  booking: Record<string, unknown>,
  usageContext: AiUsageContext | null,
  existingRow?: BookingAiReviewRow | null
): Promise<{
  result: AiReviewSectionResult;
  extractedAmount: number | null;
  persistPatch: Record<string, string>;
}> {
  const receiptUrl = String(booking.payment_receipt_url || '');
  const bookingSource = String(booking.booking_source || 'Direct');
  const isAirbnb = /airbnb/i.test(bookingSource);

  const inputs = {
    receipt_url: receiptUrl,
    booking_source: bookingSource,
    down_payment: coerceNumber(booking.down_payment),
    booking_rate: coerceNumber(booking.booking_rate),
  };
  const fingerprint = await computeSectionFingerprint(inputs);

  if (existingRow?.pricing_result?.fingerprint === fingerprint) {
    const reused = buildSectionResult(
      existingRow.pricing_result.summary,
      existingRow.pricing_result.flags,
      fingerprint,
      true
    );
    reused.updated_at = nowIso();
    const amount = extractAmountFromResult(existingRow.pricing_result);
    return { result: reused, extractedAmount: amount, persistPatch: {} };
  }

  if (isAirbnb || isBlankUrl(receiptUrl)) {
    const summary = isAirbnb
      ? 'Airbnb booking — no downpayment receipt expected.'
      : 'Downpayment receipt not uploaded yet.';
    const flags: AiReviewFlag[] = isAirbnb ? [] : [missingFileFlag('Downpayment receipt')];
    return {
      result: buildSectionResult(summary, flags, fingerprint, false),
      extractedAmount: null,
      persistPatch: {},
    };
  }

  const file = await downloadStorageFile(receiptUrl);
  if (!file) {
    return {
      result: buildSectionResult(
        'Downpayment receipt is on file but could not be opened.',
        [
          uploadedFileFlag(
            'Downpayment receipt',
            'the file could not be opened — re-upload may be needed.'
          ),
        ],
        fingerprint,
        false
      ),
      extractedAmount: null,
      persistPatch: {},
    };
  }

  const rawText = await callGeminiBatched(
    'booking_ai_summary_pricing',
    PRICING_PROMPT,
    [{ bytes: file.bytes, mimeType: file.mimeType, label: 'Receipt' }],
    usageContext,
    'booking-ai-pricing'
  );

  const parsed = parseJsonObject(rawText);
  const verdict = normalizeVerdict(parsed?.verdict);
  const extractedAmount = coerceNumber(parsed?.extracted_amount);
  const amountConfidence = String(parsed?.amount_confidence || '').toLowerCase();
  // Leaves room for the appended amount without cutting the model's sentence short.
  const summaryBase = trimToLastSentence(
    clampSummary(
      clarifyDocumentSubject(
        String(parsed?.summary || 'Downpayment receipt uploaded. Please review.'),
        'Downpayment receipt'
      ),
      118
    )
  );
  const summary =
    extractedAmount !== null ? `${summaryBase} Amount ${pesoMoney(extractedAmount)}.` : summaryBase;

  const flags: AiReviewFlag[] = [];
  if (verdict === 'invalid' || verdict === 'unclear') {
    flags.push(uploadedNeedsReviewFlag('Downpayment receipt', verdict));
  }

  const requiredDownpayment =
    coerceNumber(booking.down_payment) ?? coerceNumber(booking.booking_rate) ?? 0;
  if (
    extractedAmount !== null &&
    requiredDownpayment > 0 &&
    extractedAmount < requiredDownpayment
  ) {
    flags.push(
      uploadedFileFlag(
        'Downpayment receipt',
        `it shows ${pesoMoney(extractedAmount)} — ${pesoMoney(requiredDownpayment)} is due.`
      )
    );
  }
  // Skipped when the verdict flag above already says the image isn't readable payment proof.
  if (verdict !== 'invalid' && verdict !== 'unclear') {
    if (extractedAmount === null) {
      flags.push(uploadedFileFlag('Downpayment receipt', 'no amount could be read from it.'));
    } else if (amountConfidence === 'low') {
      flags.push(uploadedFileFlag('Downpayment receipt', 'the amount is hard to read.'));
    }
  }

  const persistPatch: Record<string, string> = {
    dp_receipt_ai_verdict: verdict,
    dp_receipt_ai_summary: summary,
  };

  return {
    result: buildSectionResult(summary, flags, fingerprint, false),
    extractedAmount,
    persistPatch,
  };
}

function extractAmountFromResult(result: AiReviewSectionResult | null | undefined): number | null {
  if (!result) return null;
  const match = result.summary.match(/₱([\d,]+\.?\d*)/);
  if (!match) return null;
  return coerceNumber(match[1].replace(/,/g, ''));
}

export async function computeParkingSection(
  booking: Record<string, unknown>,
  pricingResult: AiReviewSectionResult | null,
  extractedAmount: number | null,
  existingRow?: BookingAiReviewRow | null
): Promise<AiReviewSectionResult> {
  const needParking = booking.need_parking === true || String(booking.need_parking) === 'true';
  const inputs = {
    need_parking: needParking,
    parking_fee_included_in_downpayment: !!booking.parking_fee_included_in_downpayment,
    parking_rate_guest: coerceNumber(booking.parking_rate_guest),
    parking_rate_paid: coerceNumber(booking.parking_rate_paid),
    parking_payment_receipt_url: String(booking.parking_payment_receipt_url || ''),
    pricing_fingerprint: pricingResult?.fingerprint ?? '',
  };
  const fingerprint = await computeSectionFingerprint(inputs);

  if (existingRow?.parking_result?.fingerprint === fingerprint) {
    const reused = buildSectionResult(
      existingRow.parking_result.summary,
      existingRow.parking_result.flags,
      fingerprint,
      true
    );
    reused.updated_at = nowIso();
    return reused;
  }

  if (!needParking) {
    return buildSectionResult('No parking requested.', [], fingerprint, false);
  }

  const flags: AiReviewFlag[] = [];
  const parkingRateGuest = coerceNumber(booking.parking_rate_guest) ?? 0;
  const included = booking.parking_fee_included_in_downpayment === true;
  const dpReceiptUploaded = !isBlankUrl(String(booking.payment_receipt_url || '').trim());
  const feeSuffix = parkingRateGuest ? ` · guest fee ${pesoMoney(parkingRateGuest)}` : '';
  let summary = `Parking requested${feeSuffix}.`;

  if (included) {
    if (extractedAmount !== null && parkingRateGuest > 0) {
      if (extractedAmount < parkingRateGuest) {
        flags.push(
          uploadedFileFlag(
            'Downpayment receipt',
            `it shows ${pesoMoney(extractedAmount)}, which does not cover the ${pesoMoney(parkingRateGuest)} parking fee.`
          )
        );
      } else {
        summary = `Parking fee ${pesoMoney(parkingRateGuest)} is covered by the downpayment receipt.`;
      }
    } else if (extractedAmount === null) {
      // Branch on receipt presence: "amount unverified" alone leaves the host
      // unsure whether to chase an upload or re-read a file already on record.
      flags.push(
        dpReceiptUploaded
          ? uploadedFileFlag(
              'Downpayment receipt',
              'no amount could be read, so the parking fee is unverified.'
            )
          : flag('Downpayment receipt not uploaded yet — parking fee unverified.', 'warning')
      );
      summary = `Parking requested${feeSuffix} · amount unverified.`;
    }
  } else {
    const parkingReceipt = String(booking.parking_payment_receipt_url || '').trim();
    if (isBlankUrl(parkingReceipt)) {
      flags.push(missingFileFlag('Parking payment receipt'));
      summary = `Parking requested${feeSuffix} · paid separately, no receipt yet.`;
    } else {
      const parkingVerdict = String(booking.parking_receipt_ai_verdict || '');
      if (parkingVerdict === 'invalid' || parkingVerdict === 'unclear') {
        flags.push(
          uploadedNeedsReviewFlag(
            'Parking payment receipt',
            parkingVerdict as 'invalid' | 'unclear'
          )
        );
      } else {
        summary = `Parking payment receipt uploaded${feeSuffix}.`;
      }
    }
  }

  return buildSectionResult(summary, flags, fingerprint, false);
}

export function buildBookingAiSummaryRollup(row: BookingAiReviewRow): {
  flagCount: number;
  hasBlocking: boolean;
} {
  const results = [
    row.stay_details_result,
    row.guests_result,
    row.parking_result,
    row.pets_result,
    row.pricing_result,
  ];
  let flagCount = 0;
  let hasBlocking = false;
  for (const result of results) {
    if (!result) continue;
    flagCount += result.flags?.length ?? 0;
    if (result.flags?.some((f) => f.severity === 'blocking')) {
      hasBlocking = true;
    }
  }
  return { flagCount, hasBlocking };
}

export async function upsertBookingAiReview(row: BookingAiReviewRow): Promise<BookingAiReviewRow> {
  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('booking_ai_reviews')
    .upsert(row, { onConflict: 'booking_id' })
    .select()
    .single();
  if (error) {
    throw new Error(`Failed to upsert booking_ai_reviews: ${error.message}`);
  }
  return data as BookingAiReviewRow;
}

export async function getBookingAiReviewById(
  bookingId: string
): Promise<BookingAiReviewRow | null> {
  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('booking_ai_reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load booking_ai_reviews: ${error.message}`);
  }
  return data ? (data as BookingAiReviewRow) : null;
}

/** Job marked processing but no section ever left pending — likely a killed background worker. */
export function isStaleStuckProcessingRow(row: BookingAiReviewRow, staleMs = 45_000): boolean {
  if (row.job_status !== 'processing') return false;
  const statuses = [
    row.stay_details_status,
    row.guests_status,
    row.parking_status,
    row.pets_status,
    row.pricing_status,
  ];
  if (statuses.some((status) => status !== 'pending')) return false;
  const updated = row.updated_at ? Date.parse(row.updated_at) : NaN;
  if (!Number.isFinite(updated)) return false;
  return Date.now() - updated >= staleMs;
}

/** Flip orphaned `processing` rows to `failed` so clients stop polling. */
export async function failStaleStuckBookingAiReview(
  row: BookingAiReviewRow
): Promise<BookingAiReviewRow> {
  if (!isStaleStuckProcessingRow(row)) return row;
  const failed: BookingAiReviewRow = {
    ...row,
    job_status: 'failed',
    updated_at: nowIso(),
  };
  console.warn(`[booking-ai-review] marking stuck job failed for ${row.booking_id}`);
  return await upsertBookingAiReview(failed);
}

export function resetBookingAiReviewForRun(
  base: BookingAiReviewRow,
  propertyId: string,
  triggeredByUserId: string
): BookingAiReviewRow {
  return {
    ...base,
    property_id: propertyId,
    job_status: 'processing',
    triggered_by: triggeredByUserId,
    stay_details_status: 'pending',
    guests_status: 'pending',
    parking_status: 'pending',
    pets_status: 'pending',
    pricing_status: 'pending',
    stay_details_result: null,
    guests_result: null,
    parking_result: null,
    pets_result: null,
    pricing_result: null,
    flag_count: 0,
    has_blocking_flag: false,
  };
}

/** Marks the job processing and clears prior section results so polling shows a fresh run. */
export async function prepareBookingAiReviewJob(
  bookingId: string,
  propertyId: string,
  triggeredByUserId: string
): Promise<BookingAiReviewRow> {
  const existingRow = await getBookingAiReviewById(bookingId);
  const row = resetBookingAiReviewForRun(
    existingRow ?? emptyBookingAiReviewRow(bookingId),
    propertyId,
    triggeredByUserId
  );
  return await upsertBookingAiReview(row);
}

export async function executeBookingAiReview(
  bookingId: string,
  propertyId: string,
  triggeredByUserId: string,
  orgId: string
): Promise<BookingAiReviewRow> {
  const usageContext: AiUsageContext = { organizationId: orgId, propertyId };
  const booking = await DatabaseService.getBookingById(bookingId);
  if (!booking) throw new Error(`Booking not found: ${bookingId}`);

  const existingRow = await getBookingAiReviewById(bookingId);
  const row: BookingAiReviewRow = {
    ...(existingRow ?? emptyBookingAiReviewRow(bookingId)),
    property_id: propertyId,
    job_status: 'processing',
    triggered_by: triggeredByUserId,
  };

  let extractedAmount: number | null = null;
  let pricingResult: AiReviewSectionResult | null = null;
  let lastError: Error | null = null;

  const updateSection = async (
    section: BookingAiReviewSection,
    status: AiReviewSectionStatus,
    result?: AiReviewSectionResult | null
  ) => {
    row[sectionStatusColumn(section) as keyof BookingAiReviewRow] = status as never;
    if (status === 'processing') {
      row[sectionResultColumn(section) as keyof BookingAiReviewRow] = null as never;
    } else if (result) {
      row[sectionResultColumn(section) as keyof BookingAiReviewRow] = result as never;
    }
    const rollup = buildBookingAiSummaryRollup(row);
    row.flag_count = rollup.flagCount;
    row.has_blocking_flag = rollup.hasBlocking;
    await upsertBookingAiReview(row);
  };

  const runSection = async (
    section: BookingAiReviewSection,
    runner: () => Promise<
      | { result: AiReviewSectionResult; persistPatch?: Record<string, string> }
      | AiReviewSectionResult
    >
  ) => {
    try {
      await updateSection(section, 'processing', null);
      const output = await runner();
      const result = 'result' in output ? output.result : output;
      const persistPatch = 'result' in output ? (output.persistPatch ?? {}) : {};
      if (Object.keys(persistPatch).length > 0) {
        await DatabaseService.setWorkflowFields(bookingId, persistPatch);
      }
      await updateSection(section, 'completed', result);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[booking-ai-review] ${section} failed:`, lastError);
      await updateSection(section, 'failed', userFacingSectionFailure(section, lastError));
    }
  };

  // Order: Stay → Guests → Pricing → Parking → Pets.
  await runSection('stay_details', async () => ({
    result: await computeStayDetailsSection(
      booking as Record<string, unknown>,
      propertyId,
      existingRow ?? undefined
    ),
  }));

  await runSection('guests', async () =>
    runGuestsSection(booking as Record<string, unknown>, usageContext, existingRow ?? undefined)
  );

  await runSection('pricing', async () => {
    const pricing = await runPricingSection(
      booking as Record<string, unknown>,
      usageContext,
      existingRow ?? undefined
    );
    extractedAmount = pricing.extractedAmount;
    pricingResult = pricing.result;
    return pricing;
  });

  await runSection('parking', async () => ({
    result: await computeParkingSection(
      booking as Record<string, unknown>,
      pricingResult,
      extractedAmount,
      existingRow ?? undefined
    ),
  }));

  await runSection('pets', async () =>
    runPetsSection(booking as Record<string, unknown>, usageContext, existingRow ?? undefined)
  );

  row.job_status = lastError ? 'failed' : 'completed';
  row.updated_at = nowIso();
  await upsertBookingAiReview(row);
  return row;
}

export async function runBookingAiReview(
  bookingId: string,
  propertyId: string,
  triggeredByUserId: string,
  orgId: string
): Promise<BookingAiReviewRow> {
  await prepareBookingAiReviewJob(bookingId, propertyId, triggeredByUserId);
  return executeBookingAiReview(bookingId, propertyId, triggeredByUserId, orgId);
}

export function isAiQuotaError(error: unknown): error is AiQuotaExceededError {
  const err = error as Error & { code?: string };
  return err?.name === 'AiQuotaExceededError' || err?.code === 'AI_QUOTA_EXCEEDED';
}

export function isAiPlatformDisabledError(error: unknown): error is AiPlatformDisabledError {
  const err = error as Error & { code?: string };
  return err?.name === 'AiPlatformDisabledError' || err?.code === 'AI_PLATFORM_DISABLED';
}
