/**
 * Deterministic safety guard for guest-facing inbox AI replies.
 */

export type GuardResult = { safe: true } | { safe: false; reason: string };

export type GuestInquiryIntent = 'normal' | 'sensitive';

export type GuestReplyGuardInput = {
  draftText: string;
  guestMessage?: string | null;
  allowedFacts: {
    pricingValues: number[];
    allowedAccountNumbers?: string[];
  };
  participantName?: string | null;
  otherGuestNames?: string[];
};

export const AI_SUGGEST_FALLBACK_REPLY = 'Let me check on that and get back to you shortly.';

const OWNER_SENSITIVE_TOPIC_PATTERN =
  /\b(revenue|expenses?|profit|net income|payroll|salary|maintenance schedule|maintenance item|internal note|internal only|telegram|bot token|api[_ ]?key|password|secret|service[_ ]?role|refresh token|gmail|spreadsheet id|calendar id)\b/i;

const SENSITIVE_GUEST_REQUEST_PATTERN =
  /\b(other guests?|guest list|who (?:else )?(?:is|are) (?:staying|booked|checking in)|who booked|name of (?:the )?guest|booked on|my revenue|your revenue|how much (?:do you|you) (?:earn|make)|profit margin|finance report|owner earnings|internal ops|telegram bot)\b/i;

const NORMAL_GUEST_TOPIC_PATTERN =
  /\b(available|availability|today|tonight|rate|price|pricing|payment|gcash|cash|cancel|cancellation|refund|address|location|map|tower|floor|residence|unit|amenit|wifi|parking|pet|check[- ]?in|check[- ]?out|book|booking|how to pay|payment method)\b/i;

const CURRENCY_AMOUNT_PATTERN =
  /(?:₱|PHP\s*|P\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi;

function normalizeAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAccountDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function amountsClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

export function classifyGuestInquiryIntent(
  guestMessage: string | null | undefined
): GuestInquiryIntent {
  const text = String(guestMessage ?? '').trim();
  if (!text) return 'normal';
  if (SENSITIVE_GUEST_REQUEST_PATTERN.test(text)) return 'sensitive';
  if (NORMAL_GUEST_TOPIC_PATTERN.test(text)) return 'normal';
  return 'normal';
}

function draftAppropriatelyRefusesSensitive(draftText: string): boolean {
  return /\b(cannot share|can't share|not able to share|unable to share|for privacy|host team|check with (?:the )?host|I'?ll check with)\b/i.test(
    draftText
  );
}

function extractDraftAmounts(draftText: string): number[] {
  const amounts: number[] = [];
  for (const match of draftText.matchAll(CURRENCY_AMOUNT_PATTERN)) {
    const raw = match[1]?.replace(/,/g, '');
    if (!raw) continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) amounts.push(normalizeAmount(parsed));
  }
  return amounts;
}

function isAllowedAmount(amount: number, allowedValues: number[]): boolean {
  const normalizedAllowed = allowedValues.map(normalizeAmount);
  if (normalizedAllowed.some((allowed) => amountsClose(amount, allowed))) {
    return true;
  }
  return normalizedAllowed.some((allowed) => Math.abs(amount - allowed) <= 5);
}

function containsOtherGuestName(
  draftText: string,
  participantName: string | null | undefined,
  otherGuestNames: string[]
): string | null {
  if (otherGuestNames.length === 0) return null;

  const draftLower = draftText.toLowerCase();
  const participantTokens = new Set(
    String(participantName ?? '')
      .split(/[\s,/&]+/)
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length >= 2)
  );

  for (const name of otherGuestNames) {
    const trimmed = name.trim();
    if (trimmed.length < 3) continue;
    const lower = trimmed.toLowerCase();
    if (participantTokens.has(lower)) continue;
    if (draftLower.includes(lower)) {
      return trimmed;
    }
  }

  return null;
}

function draftSharesOwnerSensitiveTopic(draftText: string): boolean {
  return (
    OWNER_SENSITIVE_TOPIC_PATTERN.test(draftText) && !draftAppropriatelyRefusesSensitive(draftText)
  );
}

export function assertSafeGuestReply(input: GuestReplyGuardInput): GuardResult {
  const draftText = input.draftText.trim();
  if (!draftText) {
    return { safe: false, reason: 'empty reply' };
  }

  const intent = classifyGuestInquiryIntent(input.guestMessage);

  const leakedGuest = containsOtherGuestName(
    draftText,
    input.participantName,
    input.otherGuestNames ?? []
  );
  if (leakedGuest) {
    return { safe: false, reason: `other guest name: ${leakedGuest}` };
  }

  if (draftSharesOwnerSensitiveTopic(draftText)) {
    return { safe: false, reason: 'owner/internal sensitive topic in reply' };
  }

  if (intent === 'sensitive') {
    if (draftAppropriatelyRefusesSensitive(draftText)) {
      return { safe: true };
    }
    if (/\b(revenue|profit|expenses?|net income)\b/i.test(draftText)) {
      return { safe: false, reason: 'sensitive inquiry answered with finance data' };
    }
  }

  const draftAmounts = extractDraftAmounts(draftText);
  if (draftAmounts.length > 0 && input.allowedFacts.pricingValues.length === 0) {
    return { safe: false, reason: 'pricing mentioned without grounded facts' };
  }

  for (const amount of draftAmounts) {
    if (!isAllowedAmount(amount, input.allowedFacts.pricingValues)) {
      return { safe: false, reason: `ungrounded amount: ${amount}` };
    }
  }

  return { safe: true };
}
