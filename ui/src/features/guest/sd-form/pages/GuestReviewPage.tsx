import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import {
  DEFAULT_GUEST_PAYMENT_INFO,
  useGuestPaymentInfo,
} from '@/features/guest/form/hooks/useGuestPaymentInfo';
import { pickGuestBrandHeaderProps } from '@/features/guest/form/lib/guestFormBranding';
import { SdFormReviewSection } from '@/features/guest/sd-form/components/SdFormReviewSection';
import { VoucherReveal } from '@/features/guest/sd-form/components/VoucherReveal';
import {
  claimSdVoucher,
  fetchGuestReview,
  type GuestReviewBootstrap,
} from '@/features/guest/sd-form/lib/api';
import {
  findVoucher,
  VOUCHER_DISCOUNT_MAX,
  type Voucher,
} from '@/features/guest/sd-form/lib/voucher';


import { GuestFormBrandHeader } from '@/components/branding/GuestFormBrandHeader';
import { SdFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

type Phase = 'review' | 'voucher' | 'done';

const GUEST_REVIEW_BRAND_TITLE = 'Guest Review';

export function GuestReviewPage() {
  const [searchParams] = useSearchParams();
  const bookingId = (searchParams.get('bookingId') ?? '').trim();
  const { data: guestBrand = DEFAULT_GUEST_PAYMENT_INFO } = useGuestPaymentInfo();
  const brandHeader = pickGuestBrandHeaderProps(guestBrand);
  const [phase, setPhase] = useState<Phase>('review');

  const query = useQuery({
    queryKey: ['guest-review', bookingId],
    queryFn: () => fetchGuestReview(bookingId),
    enabled: Boolean(bookingId),
    retry: false,
  });

  const existingVoucher = query.data?.next_stay_voucher_code
    ? findVoucher(query.data.next_stay_voucher_code)
    : null;

  const claimMut = useMutation({
    mutationFn: async (): Promise<Voucher> => {
      const res = await claimSdVoucher(bookingId);
      const v = findVoucher(res.code);
      if (!v) throw new Error('Received an unknown voucher code from the server.');
      return v;
    },
    onError: (err: Error) => {
      toast.error(friendlyToastError(err, 'Could not reveal your voucher'));
    },
  });

  useEffect(() => {
    if ((existingVoucher || query.data?.guest_review_submitted) && phase === 'review') {
      setPhase('voucher');
    }
  }, [existingVoucher, query.data?.guest_review_submitted, phase]);

  if (!bookingId) {
    return (
      <div className="guest-inner-enter mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">Missing booking link.</p>
      </div>
    );
  }

  if (query.isLoading) {
    return <SdFormPageSkeleton title={GUEST_REVIEW_BRAND_TITLE} />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="guest-inner-enter mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
        <p className="text-foreground text-base font-semibold">Review unavailable</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {query.error instanceof Error ? query.error.message : 'This link is not valid.'}
        </p>
      </div>
    );
  }

  return (
    <GuestReviewContent
      bookingId={bookingId}
      data={query.data}
      phase={phase}
      brandHeader={brandHeader}
      existingVoucher={existingVoucher}
      isClaiming={claimMut.isPending}
      onClaim={() => claimMut.mutateAsync()}
      onReviewSubmitted={() => setPhase('voucher')}
      onVoucherDone={() => setPhase('done')}
    />
  );
}

function GuestReviewContent({
  bookingId,
  data,
  phase,
  brandHeader,
  existingVoucher,
  isClaiming,
  onClaim,
  onReviewSubmitted,
  onVoucherDone,
}: {
  bookingId: string;
  data: GuestReviewBootstrap;
  phase: Phase;
  brandHeader: ReturnType<typeof pickGuestBrandHeaderProps>;
  existingVoucher: Voucher | null;
  isClaiming: boolean;
  onClaim: () => Promise<Voucher>;
  onReviewSubmitted: () => void;
  onVoucherDone: () => void;
}) {
  return (
    <div className="guest-inner-enter relative mx-auto w-full max-w-xl space-y-6 p-4 sm:p-6 lg:p-8">
      <GuestFormBrandHeader {...brandHeader} title={GUEST_REVIEW_BRAND_TITLE} />

      {phase === 'review' ? (
        <>
          <header className="space-y-3 px-1 text-center sm:px-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Thanks for staying with us! Share a quick review for a chance to win up to ₱
              {VOUCHER_DISCOUNT_MAX.toLocaleString('en-PH')} or a free stay on your next booking.
            </p>
          </header>
          <SdFormReviewSection
            bookingId={bookingId}
            awaitingBalanceSettlement={false}
            onReviewSubmitted={onReviewSubmitted}
          />
        </>
      ) : null}

      {phase === 'voucher' ? (
        <VoucherReveal
          reviewSocialUrl={data.review_social_url || data.facebook_reviews_url}
          reviewSocialLabel={data.review_social_label || 'Facebook'}
          existingVoucher={existingVoucher}
          isClaiming={isClaiming}
          onClaim={onClaim}
          onContinue={onVoucherDone}
          primaryGuestName={data.primary_guest_name}
          checkInDate={data.check_in_date}
          checkOutDate={data.check_out_date}
        />
      ) : null}

      {phase === 'done' ? (
        <div className="border-border/60 bg-muted/20 flex flex-col items-center gap-3 rounded-xl border px-4 py-10 text-center">
          <span className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full">
            <Check className="size-6" aria-hidden />
          </span>
          <p className="text-foreground text-sm font-semibold">Thanks for your review</p>
        </div>
      ) : null}
    </div>
  );
}
