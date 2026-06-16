/**
 * AI payment receipt validation via Google Gemini Flash (vision).
 * Non-blocking when GEMINI_API_KEY is missing or the API errors.
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
};

export const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiIntegrationVerifyResult = {
  apiKeyConfigured: boolean;
  model: string;
  ok: boolean;
  latencyMs?: number;
  statusCode?: number;
  error?: string;
};

/** Admin-only: ping Gemini with a minimal text request using the same model as receipt validation. */
export async function verifyGeminiIntegration(): Promise<GeminiIntegrationVerifyResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  const base: GeminiIntegrationVerifyResult = {
    apiKeyConfigured: !!apiKey,
    model: GEMINI_MODEL,
    ok: false,
  };

  if (!apiKey) {
    return {
      ...base,
      error: 'GEMINI_API_KEY is not set in Edge secrets',
    };
  }

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

function parseGeminiJson(text: string): ReceiptValidationResult | null {
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
      'Receipt analyzed.';
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

export async function validateReceiptImage(
  imageBytes: Uint8Array,
  mimeType: string,
): Promise<ReceiptValidationResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!apiKey) {
    console.warn('[receipt-validation] GEMINI_API_KEY not set — skipping');
    return skipped();
  }
  if (!imageBytes?.length) {
    return skipped('No image data to validate');
  }

  const safeMime = mimeType?.startsWith('image/') ? mimeType : 'image/jpeg';
  const base64 = bytesToBase64(imageBytes);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: RECEIPT_PROMPT },
            {
              inline_data: {
                mime_type: safeMime,
                data: base64,
              },
            },
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
      const detail = parseGeminiApiError(res.status, errText);
      console.error('[receipt-validation] Gemini API error:', res.status, errText);
      return aiModelFailure('AI validation failed', detail);
    }

    const body = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = parseGeminiJson(text);
    if (!parsed) {
      console.warn('[receipt-validation] Could not parse Gemini response:', text.slice(0, 200));
      return aiModelFailure(
        'AI validation returned unreadable result',
        'The AI model returned a response we could not parse. Try again.',
      );
    }

    console.log(
      `[receipt-validation] verdict=${parsed.verdict} confidence=${parsed.confidence} summary=${parsed.summary}`,
    );
    return parsed;
  } catch (err) {
    console.error('[receipt-validation] Unexpected error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return aiModelFailure('AI validation failed', detail);
  }
}

export async function validateReceiptFile(file: File | Blob): Promise<ReceiptValidationResult> {
  const mimeType = file instanceof File ? (file.type || 'image/jpeg') : 'image/jpeg';
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateReceiptImage(bytes, mimeType);
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
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/** Download a stored receipt image and run Gemini validation (admin backfill). */
export async function validateReceiptFromStorageUrl(
  url: string,
): Promise<ReceiptValidationResult> {
  const loc = parseStorageUrl(url);
  if (!loc) {
    return skipped('Could not parse receipt URL');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { data, error } = await supabase.storage.from(loc.bucket).download(loc.path);
    if (error || !data) {
      console.error('[receipt-validation] Storage download failed:', error?.message);
      return skipped('Could not download receipt image');
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const mimeType = data.type?.startsWith('image/')
      ? data.type
      : mimeTypeFromPath(loc.path);
    return await validateReceiptImage(bytes, mimeType);
  } catch (err) {
    console.error('[receipt-validation] Storage download error:', err);
    return skipped('Could not download receipt image');
  }
}

export type ReceiptBackfillKind = 'downpayment' | 'balance' | 'parking';

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
export function receiptUrlNeedsAiBackfill(
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

  const validated: ReceiptBackfillItem[] = [];
  const errors: ReceiptBackfillError[] = [];
  for (const target of targets) {
    const validation = await validateReceiptFromStorageUrl(target.url);
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
    Object.assign(patch, dbPatchForReceiptValidation(item.kind, {
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
  };

export function dbPatchForReceiptValidation(
  kind: 'downpayment' | 'balance' | 'parking',
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
  return {
    balance_receipt_ai_verdict: result.verdict,
    balance_receipt_ai_summary: result.summary,
  };
}

export function receiptKindForAssetType(
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
