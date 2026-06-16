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
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RECEIPT_PROMPT = `You are validating a payment receipt image for a vacation rental booking in the Philippines.
Analyze the image and return ONLY valid JSON (no markdown) with this exact shape:
{
  "verdict": "valid" | "likely_valid" | "unclear" | "invalid",
  "confidence": number between 0 and 1,
  "summary": "one short sentence for an admin",
  "has_amount": boolean,
  "has_date": boolean,
  "has_reference": boolean
}

Rules:
- "valid": clearly a real payment/transfer receipt or bank/e-wallet screenshot showing money sent with amount and reference or date.
- "likely_valid": looks like a payment screenshot but some fields are blurry, cropped, or partially visible.
- "unclear": image is too blurry, unrelated, or cannot tell if it is a payment receipt.
- "invalid": clearly NOT a payment receipt (random photo, meme, blank, ID only, chat without payment proof, etc.).
- Prefer GCash, Maya, bank transfer, or similar payment app screenshots as valid when they show transaction details.
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
      console.error('[receipt-validation] Gemini API error:', res.status, errText);
      return skipped('AI validation failed');
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
      return skipped('AI validation returned unreadable result');
    }

    console.log(
      `[receipt-validation] verdict=${parsed.verdict} confidence=${parsed.confidence} summary=${parsed.summary}`,
    );
    return parsed;
  } catch (err) {
    console.error('[receipt-validation] Unexpected error:', err);
    return skipped('AI validation failed');
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
): Promise<ReceiptBackfillItem[]> {
  const status = String(booking.status ?? '');
  if (TERMINAL_BOOKING_STATUSES.has(status)) {
    return [];
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

  const results: ReceiptBackfillItem[] = [];
  for (const target of targets) {
    const validation = await validateReceiptFromStorageUrl(target.url);
    results.push({
      kind: target.kind,
      verdict: validation.verdict,
      summary: validation.summary,
    });
  }
  return results;
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
