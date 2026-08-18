/**
 * Thin PayMongo REST client — Payment Links API (/v1/payment_links).
 * Shared by property subscription checkout and future AI credit purchases.
 */

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

export type PaymongoCreateLinkInput = {
  amountCentavos: number;
  currency?: string;
  description: string;
  remarks?: string;
  metadata?: Record<string, string>;
};

export type PaymongoPaymentLink = {
  id: string;
  checkoutUrl: string;
  referenceNumber: string | null;
  status: string;
  livemode: boolean;
};

function getSecretKey(): string {
  const key = Deno.env.get('PAYMONGO_SECRET_KEY')?.trim();
  if (!key) throw new Error('PayMongo is not configured (PAYMONGO_SECRET_KEY missing)');
  return key;
}

function authHeader(secretKey: string): string {
  const encoded = btoa(`${secretKey}:`);
  return `Basic ${encoded}`;
}

function parseLinkResponse(json: Record<string, unknown>): PaymongoPaymentLink {
  const data = json.data as Record<string, unknown> | undefined;
  if (!data?.id) {
    const errors = json.errors as Array<{ detail?: string }> | undefined;
    const detail = errors?.[0]?.detail ?? 'PayMongo link creation failed';
    throw new Error(detail);
  }

  const url =
    (typeof data.url === 'string' && data.url) ||
    (typeof (data as { checkout_url?: string }).checkout_url === 'string'
      ? (data as { checkout_url: string }).checkout_url
      : '');

  if (!url) throw new Error('PayMongo did not return a checkout URL');

  return {
    id: String(data.id),
    checkoutUrl: url,
    referenceNumber: typeof data.reference_number === 'string' ? data.reference_number : null,
    status: typeof data.status === 'string' ? data.status : 'pending',
    livemode: Boolean(data.livemode),
  };
}

export async function createPaymongoPaymentLink(
  input: PaymongoCreateLinkInput
): Promise<PaymongoPaymentLink> {
  if (!Number.isFinite(input.amountCentavos) || input.amountCentavos < 100) {
    throw new Error('Payment amount must be at least PHP 1.00');
  }

  const secretKey = getSecretKey();
  const body: Record<string, unknown> = {
    amount: Math.round(input.amountCentavos),
    currency: input.currency ?? 'PHP',
    description: input.description.slice(0, 1000),
  };
  if (input.remarks) body.remarks = input.remarks.slice(0, 1000);
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    body.metadata = input.metadata;
  }

  const res = await fetch(`${PAYMONGO_API_BASE}/payment_links`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(secretKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errors = json.errors as Array<{ detail?: string }> | undefined;
    throw new Error(errors?.[0]?.detail ?? `PayMongo HTTP ${res.status}`);
  }

  return parseLinkResponse(json);
}

export function phpToCentavos(amountPhp: number): number {
  return Math.round(amountPhp * 100);
}

export function isPaymongoTestMode(): boolean {
  const key = Deno.env.get('PAYMONGO_SECRET_KEY')?.trim() ?? '';
  return key.startsWith('sk_test');
}
