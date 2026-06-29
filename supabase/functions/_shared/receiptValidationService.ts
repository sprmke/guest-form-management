/**
 * AI document validation via Google Gemini Flash (vision) with multi-key rotation
 * and Groq (Llama 4 Scout) fallback. Non-blocking when no API keys are configured.
 *
 * Provider chain:
 *  1. Gemini keys (round-robin from GEMINI_API_KEYS or single GEMINI_API_KEY)
 *  2. Groq Llama 4 Scout (GROQ_API_KEY) — fallback when all Gemini keys fail
 *
 * Rate-limit (429) or server errors on one key immediately try the next.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export type ReceiptValidationVerdict =
  | 'valid'
  | 'likely_valid'
  | 'unclear'
  | 'invalid'
  | 'skipped';

export type ReceiptValidationResult = {
  verdict: ReceiptValidationVerdict;
  confidence: number | null;
  summary: string;
  has_amount: boolean;
  has_date: boolean;
  has_reference: boolean;
  /** Gemini/network failure — do not persist verdict; surface to admin for retry. */
  aiModelError?: string;
  /** Which provider produced the result (for logging/debugging). */
  provider?: 'gemini' | 'groq';
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// --- Multi-key rotation state (in-memory, per isolate) ---

let geminiKeyIndex = 0;

function getGeminiApiKeys(): string[] {
  const multi = Deno.env.get('GEMINI_API_KEYS')?.trim();
  if (multi) {
    return multi.split(',').map((k) => k.trim()).filter(Boolean);
  }
  const single = Deno.env.get('GEMINI_API_KEY')?.trim();
  return single ? [single] : [];
}

function getGroqApiKey(): string | null {
  return Deno.env.get('GROQ_API_KEY')?.trim() || null;
}

function shouldTryNextProvider(status: number): boolean {
  return status === 429 || status === 403 || status >= 500;
}

// --- Verify integration ---

export type GeminiIntegrationVerifyResult = {
  apiKeyConfigured: boolean;
  model: string;
  ok: boolean;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
  geminiKeysCount?: number;
  groqConfigured?: boolean;
};

/** Admin-only: ping Gemini with a minimal text request + report Groq availability. */
export async function verifyGeminiIntegration(): Promise<GeminiIntegrationVerifyResult> {
  const keys = getGeminiApiKeys();
  const groqKey = getGroqApiKey();
  const base: GeminiIntegrationVerifyResult = {
    apiKeyConfigured: keys.length > 0,
    model: GEMINI_MODEL,
    ok: false,
    geminiKeysCount: keys.length,
    groqConfigured: !!groqKey,
  };

  if (keys.length === 0) {
    return {
      ...base,
      error: 'No Gemini API keys configured (set GEMINI_API_KEYS or GEMINI_API_KEY)',
    };
  }

  const apiKey = keys[0];
  const started = Date.now();
  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Reply with exactly: ok' }],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8,
        },
      }),
    });

    const latencyMs = Date.now() - started;
    const statusCode = res.status;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let message = `Gemini API returned ${statusCode}`;
      try {
        const parsed = JSON.parse(errText) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (errText.trim()) message = errText.trim().slice(0, 240);
      }
      return { ...base, latencyMs, statusCode, error: message };
    }

    await res.json().catch(() => ({}));
    return { ...base, ok: true, latencyMs, statusCode };
  } catch (err) {
    return {
      ...base,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const RECEIPT_PROMPT = `You are validating a payment proof image for a vacation rental booking in the Philippines.
Analyze the image and return ONLY valid JSON (no markdown) with this exact shape:
{
  "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
  "confidence": number between 0 and 1,
  "summary": "one short sentence for an admin",
  "has_amount": boolean,
  "has_date": boolean,
  "has_reference": boolean
}

Accept TWO forms of payment proof:
1) Digital — GCash, Maya, InstaPay, bank transfer, or similar e-wallet/bank app screenshots showing money sent (amount plus date or reference when visible).
2) Cash — a photo clearly showing Philippine peso (PHP) banknotes as payment proof (e.g. bills held in hand, fanned out, or on a table). Recognizable PHP denominations (₱20–₱1000) count as valid proof even without a transaction reference or date.

Rules:
- "valid": clear digital transfer receipt/screenshot with transaction details, OR a clear photo of PHP cash bills as payment proof.
- "likely_valid": payment screenshot or cash photo that is partly blurry/cropped but still recognizable as payment proof.
- "unclear": too blurry or ambiguous to tell if it is digital payment proof or PHP cash payment proof.
- "invalid": clearly NOT payment proof (random photo, scenery, meme, blank, ID only, chat without payment proof, unrelated objects with no visible transfer details or PHP cash).
- For cash photos: set has_amount true when bill denominations are visible; has_date and has_reference are usually false — that is OK.
- summary must be plain English, max 120 characters, no line breaks.`;

const VALID_ID_PROMPT = `You are validating a government-issued photo ID image for a vacation rental guest check-in in the Philippines.
Analyze the image or PDF and return ONLY valid JSON (no markdown) with this exact shape:
{
  "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
  "confidence": number between 0 and 1,
  "summary": "one short sentence for an admin",
  "has_amount": boolean,
  "has_date": boolean,
  "has_reference": boolean
}

Accept common Philippine and travel IDs, including:
- Philippine National ID (PhilSys / ePhilID)
- Passport (Philippine or foreign)
- Driver's license
- UMID, SSS, PhilHealth, postal ID, voter's ID, PRC ID, and similar government photo IDs

Rules:
- "valid": clear government-issued photo ID with recognizable ID document layout (name and/or photo visible; rotation is OK).
- "likely_valid": ID appears genuine but is blurry, cropped, glare-heavy, or rotated — still recognizable as an ID document.
- "unclear": too blurry or ambiguous to tell if it is a government ID.
- "invalid": clearly NOT an ID (selfie only, payment receipt, scenery, meme, blank image, random object, chat screenshot without ID).
- Set has_amount false. Set has_date true when a birth date or expiry is visible. Set has_reference true when an ID number is visible.
- summary must be plain English, max 120 characters, no line breaks. Mention ID type when confident (e.g. "PhilSys ID", "passport").`;

function skipped(summary = 'AI validation unavailable'): ReceiptValidationResult {
  return {
    verdict: 'skipped',
    confidence: null,
    summary,
    has_amount: false,
    has_date: false,
    has_reference: false,
  };
}

function aiModelFailure(summary: string, detail?: string): ReceiptValidationResult {
  return {
    ...skipped(summary),
    aiModelError: detail ?? summary,
  };
}

function parseGeminiApiError(status: number, errText: string): string {
  let message = `Gemini API returned ${status}`;
  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string } };
    if (parsed.error?.message) message = parsed.error.message;
  } catch {
    if (errText.trim()) message = errText.trim().slice(0, 240);
  }
  return message;
}

/** True when a real verdict was produced and may be written to guest_submissions. */
export function shouldPersistReceiptValidation(
  result: ReceiptValidationResult,
): boolean {
  return !result.aiModelError;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normalizeVerdict(raw: unknown): ReceiptValidationVerdict {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'valid' || v === 'likely_valid' || v === 'unclear' || v === 'invalid') {
    return v;
  }
  return 'unclear';
}

function parseGeminiJson(
  text: string,
  defaultSummary = 'Document analyzed.',
): ReceiptValidationResult | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const confidenceRaw = Number(parsed.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : null;
    const summary = String(parsed.summary ?? '').trim().slice(0, 200) ||
      defaultSummary;
    return {
      verdict: normalizeVerdict(parsed.verdict),
      confidence,
      summary,
      has_amount: Boolean(parsed.has_amount),
      has_date: Boolean(parsed.has_date),
      has_reference: Boolean(parsed.has_reference),
    };
  } catch {
    return null;
  }
}

function normalizeVisionMimeType(mimeType: string, path?: string): string {
  if (mimeType?.startsWith('image/')) return mimeType;
  if (mimeType === 'application/pdf') return mimeType;
  const ext = path?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Try a single Gemini key. Returns result or null if rate-limited/server-error (caller should try next). */
async function tryGeminiKey(
  apiKey: string,
  prompt: string,
  base64: string,
  safeMime: string,
  logTag: string,
  defaultSummary: string,
): Promise<ReceiptValidationResult | null> {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: safeMime, data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (shouldTryNextProvider(res.status)) {
        console.warn(`[${logTag}] Gemini key exhausted/error (${res.status}), trying next...`);
        return null; // signal: try next key/provider
      }
      const detail = parseGeminiApiError(res.status, errText);
      console.error(`[${logTag}] Gemini API error:`, res.status, errText);
      return aiModelFailure('AI validation failed', detail);
    }

    const body = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = parseGeminiJson(text, defaultSummary);
    if (!parsed) {
      console.warn(`[${logTag}] Could not parse Gemini response:`, text.slice(0, 200));
      return aiModelFailure(
        'AI validation returned unreadable result',
        'The AI model returned a response we could not parse. Try again.',
      );
    }

    console.log(
      `[${logTag}] [gemini] verdict=${parsed.verdict} confidence=${parsed.confidence} summary=${parsed.summary}`,
    );
    return { ...parsed, provider: 'gemini' };
  } catch (err) {
    console.warn(`[${logTag}] Gemini key threw (network?):`, err instanceof Error ? err.message : err);
    return null; // treat network errors as transient → try next
  }
}

const GROQ_SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

/** Groq (Llama 4 Scout) fallback — OpenAI-compatible vision API. */
async function tryGroq(
  groqKey: string,
  prompt: string,
  base64: string,
  safeMime: string,
  logTag: string,
  defaultSummary: string,
): Promise<ReceiptValidationResult | null> {
  if (!GROQ_SUPPORTED_MIME_TYPES.has(safeMime)) {
    console.warn(`[${logTag}] Groq skipped — unsupported MIME type: ${safeMime}`);
    return null;
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${safeMime};base64,${base64}` },
            },
          ],
        }],
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (shouldTryNextProvider(res.status)) {
        console.warn(`[${logTag}] Groq rate-limited/error (${res.status})`);
        return null;
      }
      console.error(`[${logTag}] Groq API error:`, res.status, errText);
      return aiModelFailure('AI validation failed (fallback)', `Groq returned ${res.status}`);
    }

    const body = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content ?? '';
    const parsed = parseGeminiJson(text, defaultSummary);
    if (!parsed) {
      console.warn(`[${logTag}] Could not parse Groq response:`, text.slice(0, 200));
      return aiModelFailure(
        'AI validation returned unreadable result',
        'Fallback AI model returned a response we could not parse.',
      );
    }

    console.log(
      `[${logTag}] [groq] verdict=${parsed.verdict} confidence=${parsed.confidence} summary=${parsed.summary}`,
    );
    return { ...parsed, provider: 'groq' };
  } catch (err) {
    console.error(`[${logTag}] Groq unexpected error:`, err);
    return null;
  }
}

/**
 * Multi-provider vision validation:
 *  1. Round-robin through Gemini keys (skip 429/5xx → next key)
 *  2. Fallback to Groq if all Gemini keys are exhausted
 *  3. Return aiModelError only when ALL providers fail
 */
async function callGeminiVision(
  prompt: string,
  imageBytes: Uint8Array,
  mimeType: string,
  logTag: string,
  defaultSummary: string,
): Promise<ReceiptValidationResult> {
  const geminiKeys = getGeminiApiKeys();
  const groqKey = getGroqApiKey();

  if (geminiKeys.length === 0 && !groqKey) {
    console.warn(`[${logTag}] No AI API keys configured — skipping`);
    return skipped();
  }
  if (!imageBytes?.length) {
    return skipped('No image data to validate');
  }

  const safeMime = normalizeVisionMimeType(mimeType);
  const base64 = bytesToBase64(imageBytes);

  // Layer 1: Try all Gemini keys (round-robin starting from last successful index)
  if (geminiKeys.length > 0) {
    const startIdx = geminiKeyIndex % geminiKeys.length;
    for (let i = 0; i < geminiKeys.length; i++) {
      const idx = (startIdx + i) % geminiKeys.length;
      const result = await tryGeminiKey(
        geminiKeys[idx], prompt, base64, safeMime, logTag, defaultSummary,
      );
      if (result) {
        geminiKeyIndex = (idx + 1) % geminiKeys.length; // advance for next call
        return result;
      }
    }
    console.warn(`[${logTag}] All ${geminiKeys.length} Gemini key(s) failed, trying Groq fallback...`);
  }

  // Layer 2: Groq fallback
  if (groqKey) {
    const result = await tryGroq(groqKey, prompt, base64, safeMime, logTag, defaultSummary);
    if (result) return result;
  }

  // All providers exhausted
  const providers = [];
  if (geminiKeys.length > 0) providers.push(`Gemini (${geminiKeys.length} key${geminiKeys.length > 1 ? 's' : ''})`);
  if (groqKey) providers.push('Groq');
  const detail = `All AI providers exhausted: ${providers.join(', ')}. Try again later.`;
  console.error(`[${logTag}] ${detail}`);
  return aiModelFailure('AI validation temporarily unavailable', detail);
}

async function validateReceiptImage(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<ReceiptValidationResult> {
  return callGeminiVision(
    RECEIPT_PROMPT,
    imageBytes,
    mimeType,
    'receipt-validation',
    'Receipt analyzed.',
  );
}

async function validateValidIdImage(
  imageBytes: Uint8Array,
  mimeType: string,
  path?: string,
): Promise<ReceiptValidationResult> {
  return callGeminiVision(
    VALID_ID_PROMPT,
    imageBytes,
    normalizeVisionMimeType(mimeType, path),
    'valid-id-validation',
    'ID analyzed.',
  );
}

export async function validateReceiptFile(file: File | Blob): Promise<ReceiptValidationResult> {
  const mimeType = file instanceof File ? (file.type || 'image/jpeg') : 'image/jpeg';
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateReceiptImage(bytes, mimeType);
}

export async function validateValidIdFile(file: File | Blob): Promise<ReceiptValidationResult> {
  const fileName = file instanceof File ? file.name : '';
  const mimeType = file instanceof File
    ? (file.type || mimeTypeFromPath(fileName))
    : 'image/jpeg';
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateValidIdImage(bytes, mimeType, fileName);
}

const STORAGE_OBJECT_PATH_RE =
  /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const trimmed = url?.trim();
  if (!trimmed || trimmed === 'dev-mode-skipped' || trimmed === 'test-mode-skipped') {
    return null;
  }
  const match = trimmed.match(STORAGE_OBJECT_PATH_RE);
  if (!match) return null;
  const bucket = match[1];
  const rawPath = match[2]?.split('?')[0] ?? '';
  if (!bucket || !rawPath) return null;
  return { bucket, path: decodeURIComponent(rawPath) };
}

function mimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

async function validateDocumentFromStorageUrl(
  url: string,
  validate: (bytes: Uint8Array, mimeType: string, path: string) => Promise<ReceiptValidationResult>,
  parseErrorSummary: string,
  downloadErrorSummary: string,
): Promise<ReceiptValidationResult> {
  const loc = parseStorageUrl(url);
  if (!loc) {
    return skipped(parseErrorSummary);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { data, error } = await supabase.storage.from(loc.bucket).download(loc.path);
    if (error || !data) {
      console.error('[document-validation] Storage download failed:', error?.message);
      return skipped(downloadErrorSummary);
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const mimeType = data.type?.startsWith('image/') || data.type === 'application/pdf'
      ? data.type
      : mimeTypeFromPath(loc.path);
    return await validate(bytes, mimeType, loc.path);
  } catch (err) {
    console.error('[document-validation] Storage download error:', err);
    return skipped(downloadErrorSummary);
  }
}

/** Download a stored receipt image and run Gemini validation (admin backfill). */
async function validateReceiptFromStorageUrl(
  url: string,
): Promise<ReceiptValidationResult> {
  return validateDocumentFromStorageUrl(
    url,
    (bytes, mimeType) => validateReceiptImage(bytes, mimeType),
    'Could not parse receipt URL',
    'Could not download receipt image',
  );
}

/** Download a stored valid ID and run Gemini validation (admin backfill). */
async function validateValidIdFromStorageUrl(
  url: string,
): Promise<ReceiptValidationResult> {
  return validateDocumentFromStorageUrl(
    url,
    (bytes, mimeType, path) => validateValidIdImage(bytes, mimeType, path),
    'Could not parse valid ID URL',
    'Could not download valid ID image',
  );
}

export type ReceiptBackfillKind = 'downpayment' | 'balance' | 'parking' | 'valid_id';

export type ReceiptBackfillItem = {
  kind: ReceiptBackfillKind;
  verdict: ReceiptValidationVerdict;
  summary: string;
};

export type ReceiptBackfillError = {
  kind: ReceiptBackfillKind;
  message: string;
};

export type ReceiptBackfillResult = {
  validated: ReceiptBackfillItem[];
  errors: ReceiptBackfillError[];
};

/** Returns true when a receipt URL exists but AI verdict was never persisted. */
function receiptUrlNeedsAiBackfill(
  url: string | null | undefined,
  verdict: string | null | undefined,
): boolean {
  return Boolean(url?.trim()) && !String(verdict ?? '').trim();
}

const TERMINAL_BOOKING_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

/**
 * One-shot backfill for legacy rows: validate stored receipt images that never
 * received an AI verdict during submit/upload.
 */
export async function backfillMissingReceiptAiVerdicts(
  booking: Record<string, unknown>,
): Promise<ReceiptBackfillResult> {
  const status = String(booking.status ?? '');
  if (TERMINAL_BOOKING_STATUSES.has(status)) {
    return { validated: [], errors: [] };
  }

  const targets: Array<{ kind: ReceiptBackfillKind; url: string }> = [];

  const dpUrl = String(booking.payment_receipt_url ?? '').trim();
  if (receiptUrlNeedsAiBackfill(dpUrl, booking.dp_receipt_ai_verdict as string)) {
    targets.push({ kind: 'downpayment', url: dpUrl });
  }

  const balanceUrl = String(booking.guest_balance_payment_receipt_url ?? '').trim();
  if (
    receiptUrlNeedsAiBackfill(
      balanceUrl,
      booking.balance_receipt_ai_verdict as string,
    )
  ) {
    targets.push({ kind: 'balance', url: balanceUrl });
  }

  const parkingUrl = String(booking.parking_payment_receipt_url ?? '').trim();
  if (
    receiptUrlNeedsAiBackfill(
      parkingUrl,
      booking.parking_receipt_ai_verdict as string,
    )
  ) {
    targets.push({ kind: 'parking', url: parkingUrl });
  }

  const validIdUrl = String(booking.valid_id_url ?? '').trim();
  if (
    receiptUrlNeedsAiBackfill(
      validIdUrl,
      booking.valid_id_ai_verdict as string,
    )
  ) {
    targets.push({ kind: 'valid_id', url: validIdUrl });
  }

  const validated: ReceiptBackfillItem[] = [];
  const errors: ReceiptBackfillError[] = [];
  for (const target of targets) {
    const validation = target.kind === 'valid_id'
      ? await validateValidIdFromStorageUrl(target.url)
      : await validateReceiptFromStorageUrl(target.url);
    if (validation.aiModelError) {
      errors.push({
        kind: target.kind,
        message: validation.aiModelError,
      });
      continue;
    }
    validated.push({
      kind: target.kind,
      verdict: validation.verdict,
      summary: validation.summary,
    });
  }
  return { validated, errors };
}

export function dbPatchFromReceiptBackfillItems(
  items: ReceiptBackfillItem[],
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const item of items) {
    Object.assign(patch, dbPatchForDocumentAiValidation(item.kind, {
      verdict: item.verdict,
      confidence: null,
      summary: item.summary,
      has_amount: false,
      has_date: false,
      has_reference: false,
    }));
  }
  return patch;
}

export function formatReceiptVerdictLabel(verdict: ReceiptValidationVerdict | string | null | undefined): string {
  switch (String(verdict ?? '').toLowerCase()) {
    case 'valid':
      return 'Valid';
    case 'likely_valid':
      return 'Likely valid';
    case 'unclear':
      return 'Unclear';
    case 'invalid':
      return 'Invalid';
    case 'skipped':
      return 'Not checked';
    default:
      return 'Unknown';
  }
}

export function receiptVerdictBlocksAdminTransition(
  verdict: ReceiptValidationVerdict | string | null | undefined,
): boolean {
  return String(verdict ?? '').toLowerCase() === 'invalid';
}

export type ReceiptValidationDbPatch =
  | {
    dp_receipt_ai_verdict: string;
    dp_receipt_ai_summary: string;
  }
  | {
    balance_receipt_ai_verdict: string;
    balance_receipt_ai_summary: string;
  }
  | {
    parking_receipt_ai_verdict: string;
    parking_receipt_ai_summary: string;
  }
  | {
    valid_id_ai_verdict: string;
    valid_id_ai_summary: string;
  };

export function dbPatchForDocumentAiValidation(
  kind: ReceiptBackfillKind,
  result: ReceiptValidationResult,
): ReceiptValidationDbPatch {
  if (kind === 'downpayment') {
    return {
      dp_receipt_ai_verdict: result.verdict,
      dp_receipt_ai_summary: result.summary,
    };
  }
  if (kind === 'parking') {
    return {
      parking_receipt_ai_verdict: result.verdict,
      parking_receipt_ai_summary: result.summary,
    };
  }
  if (kind === 'valid_id') {
    return {
      valid_id_ai_verdict: result.verdict,
      valid_id_ai_summary: result.summary,
    };
  }
  return {
    balance_receipt_ai_verdict: result.verdict,
    balance_receipt_ai_summary: result.summary,
  };
}

/** @deprecated Use dbPatchForDocumentAiValidation */
export function dbPatchForReceiptValidation(
  kind: 'downpayment' | 'balance' | 'parking',
  result: ReceiptValidationResult,
): ReceiptValidationDbPatch {
  return dbPatchForDocumentAiValidation(kind, result);
}

function receiptKindForAssetType(
  assetType: string,
): 'downpayment' | 'balance' | 'parking' | null {
  switch (assetType) {
    case 'payment_receipt':
      return 'downpayment';
    case 'guest_balance_payment_receipt':
      return 'balance';
    case 'parking_payment_receipt':
      return 'parking';
    default:
      return null;
  }
}

export function documentAiKindForAssetType(
  assetType: string,
): ReceiptBackfillKind | null {
  if (
    assetType === 'valid_id' ||
    assetType === 'guest2_valid_id' ||
    assetType === 'guest3_valid_id' ||
    assetType === 'guest4_valid_id' ||
    assetType === 'guest5_valid_id'
  ) {
    return 'valid_id';
  }
  return receiptKindForAssetType(assetType);
}
