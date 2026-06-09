/**
 * AI payment receipt validation via Google Gemini Flash (vision).
 * Non-blocking when GEMINI_API_KEY is missing or the API errors.
 */

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
  };

export function dbPatchForReceiptValidation(
  kind: 'downpayment' | 'balance',
  result: ReceiptValidationResult,
): ReceiptValidationDbPatch {
  if (kind === 'downpayment') {
    return {
      dp_receipt_ai_verdict: result.verdict,
      dp_receipt_ai_summary: result.summary,
    };
  }
  return {
    balance_receipt_ai_verdict: result.verdict,
    balance_receipt_ai_summary: result.summary,
  };
}
