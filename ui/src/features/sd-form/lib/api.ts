import type { SdBank } from './sdFormSchema';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function fnHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  };
}

export type SdFormBootstrap = {
  bookingId: string;
  primary_guest_name: string;
  guest_phone_number: string;
  security_deposit: number;
  check_in_date: string;
  check_out_date: string;
  facebook_reviews_url: string;
  /** Persisted voucher (if guest already revealed it on a prior visit). */
  next_stay_voucher_code: string | null;
  next_stay_voucher_amount: number | null;
};

export type ClaimVoucherResponse = {
  code: string;
  amount: number;
  /** True if the booking already had a voucher (no new roll). */
  alreadyAwarded: boolean;
};

export async function claimSdVoucher(
  bookingId: string,
): Promise<ClaimVoucherResponse> {
  const res = await fetch(`${FUNCTIONS_URL}/claim-sd-voucher`, {
    method: 'POST',
    headers: fnHeaders(),
    body: JSON.stringify({ bookingId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    throw new Error(
      json.error ??
        json.message ??
        `Could not claim voucher (${res.status})`,
    );
  }
  return json.data as ClaimVoucherResponse;
}

export async function fetchSdForm(bookingId: string): Promise<SdFormBootstrap> {
  const url = `${FUNCTIONS_URL}/get-sd-form?bookingId=${encodeURIComponent(bookingId)}`;
  const res = await fetch(url, { headers: fnHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    const msg =
      json.message ??
      json.error ??
      'This form is not available. Please use the link from your email or contact us on Facebook.';
    throw new Error(typeof msg === 'string' ? msg : 'Form unavailable');
  }
  return json.data as SdFormBootstrap;
}

export type SubmitSdRefundBody = {
  bookingId: string;
  /** Optional; omitted or empty stores null on the booking. */
  guestFeedback?: string | null;
  refund: {
    method: 'same_phone' | 'other_bank' | 'cash';
    phoneConfirmed?: boolean;
    bank?: SdBank;
    accountName?: string;
    accountNumber?: string;
  };
};

export async function submitSdForm(body: SubmitSdRefundBody): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/submit-sd-form`, {
    method: 'POST',
    headers: fnHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? json.message ?? `Submit failed (${res.status})`);
  }
}
