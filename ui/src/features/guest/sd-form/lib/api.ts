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

export type GuestReviewBootstrap = {
  bookingId: string;
  primary_guest_name: string;
  check_in_date: string;
  check_out_date: string;
  facebook_reviews_url: string;
  review_social_url?: string;
  review_social_platform?: string;
  review_social_label?: string;
  guest_review_submitted?: boolean;
  email_logo_url?: string;
  brand_color?: string;
  next_stay_voucher_code: string | null;
  next_stay_voucher_amount: number | null;
  review_path: 'airbnb_post_stay';
};

export async function fetchGuestReview(bookingId: string): Promise<GuestReviewBootstrap> {
  const url = `${FUNCTIONS_URL}/get-guest-review?bookingId=${encodeURIComponent(bookingId)}`;
  const res = await fetch(url, { headers: fnHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    const msg =
      json.message ??
      json.error ??
      'This review link is not available. Please contact your host if you think this is a mistake.';
    throw new Error(typeof msg === 'string' ? msg : 'Review unavailable');
  }
  return json.data as GuestReviewBootstrap;
}

export type SdFormBootstrap = {
  bookingId: string;
  primary_guest_name: string;
  guest_phone_number: string;
  security_deposit: number;
  check_in_date: string;
  check_out_date: string;
  facebook_reviews_url: string;
  review_social_url?: string;
  review_social_platform?: string;
  review_social_label?: string;
  guest_review_submitted?: boolean;
  email_logo_url?: string;
  brand_color?: string;
  /** Persisted voucher (if guest already revealed it on a prior visit). */
  next_stay_voucher_code: string | null;
  next_stay_voucher_amount: number | null;
  /**
   * True while status is still Ready for check-in but the check-out email already went out;
   * refund submit stays closed until the stay moves to Ready for check-out.
   */
  awaiting_balance_settlement?: boolean;
};

export type ClaimVoucherResponse = {
  code: string;
  amount: number;
  /** True if the booking already had a voucher (no new roll). */
  alreadyAwarded: boolean;
};

export async function claimSdVoucher(bookingId: string): Promise<ClaimVoucherResponse> {
  const res = await fetch(`${FUNCTIONS_URL}/claim-sd-voucher`, {
    method: 'POST',
    headers: fnHeaders(),
    body: JSON.stringify({ bookingId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? json.message ?? `Could not claim voucher (${res.status})`);
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

export async function submitGuestReview(input: {
  bookingId: string;
  starRating: number;
  reviewText?: string;
  feedbackTags?: string[];
  media?: File[];
}): Promise<void> {
  const form = new FormData();
  form.set('bookingId', input.bookingId);
  form.set('starRating', String(input.starRating));
  if (input.reviewText?.trim()) form.set('reviewText', input.reviewText.trim());
  if (input.feedbackTags?.length) {
    form.set('feedbackTags', JSON.stringify(input.feedbackTags));
  }
  for (const file of input.media ?? []) {
    form.append('media', file);
  }

  const res = await fetch(`${FUNCTIONS_URL}/submit-guest-review`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? json.message ?? `Review submit failed (${res.status})`);
  }
}

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
