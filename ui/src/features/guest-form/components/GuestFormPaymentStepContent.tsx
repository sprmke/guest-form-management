import { useCallback, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';

import { InlineCopyIconButton } from '@/features/admin/components/SdRefundForm';
import { formatMoney } from '@/features/admin/lib/formatters';
import type { GuestFormData } from '@/features/guest-form/schemas/guestFormSchema';
import {
  computeGuestFormPaymentBreakdown,
  GUEST_DOWN_PAYMENT_RATE_PER_NIGHT,
  GUEST_PARKING_RATE_PER_NIGHT,
} from '@/features/guest-form/lib/guestFormPayment';
import { useGuestPaymentInfo } from '@/features/guest-form/hooks/useGuestPaymentInfo';

const GCASH_QR_SRC = '/images/kame-home-gcash-qr-payment.jpg';

type Props = {
  form: UseFormReturn<GuestFormData>;
};

function nightLabel(count: number): string {
  return `${count} night${count !== 1 ? 's' : ''}`;
}

export function GuestFormPaymentStepContent({ form }: Props) {
  const { data: paymentInfo } = useGuestPaymentInfo();
  const checkInDate = form.watch('checkInDate');
  const checkOutDate = form.watch('checkOutDate');
  const needParking = form.watch('needParking');
  const parkingSameAsBookingDuration = form.watch('parkingSameAsBookingDuration');
  const parkingCheckInDate = form.watch('parkingCheckInDate');
  const parkingCheckOutDate = form.watch('parkingCheckOutDate');

  const breakdown = useMemo(
    () =>
      computeGuestFormPaymentBreakdown({
        checkInDate,
        checkOutDate,
        needParking,
        parkingSameAsBookingDuration,
        parkingCheckInDate,
        parkingCheckOutDate,
      }),
    [
      checkInDate,
      checkOutDate,
      needParking,
      parkingSameAsBookingDuration,
      parkingCheckInDate,
      parkingCheckOutDate,
    ],
  );

  const gcashName = paymentInfo?.gcashName ?? '';
  const gcashNumber = paymentInfo?.gcashNumber ?? '';

  const copyGcashName = useCallback(async () => {
    if (!gcashName) return;
    try {
      await navigator.clipboard.writeText(gcashName);
      toast.success('GCash name copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [gcashName]);

  const copyGcashNumber = useCallback(async () => {
    if (!gcashNumber) return;
    try {
      await navigator.clipboard.writeText(gcashNumber);
      toast.success('GCash number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [gcashNumber]);

  return (
    <div className="space-y-4">
      <div
        className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm"
        role="group"
        aria-label="Payment breakdown"
      >
        <p className="font-semibold text-foreground">Payment breakdown</p>
        <dl className="space-y-2 text-muted-foreground">
          <div className="flex items-start justify-between gap-3">
            <dt>
              Downpayment ({nightLabel(breakdown.stayNights)})
              <span className="mt-0.5 block text-xs">
                {formatMoney(GUEST_DOWN_PAYMENT_RATE_PER_NIGHT)} ×{' '}
                {breakdown.stayNights}
              </span>
            </dt>
            <dd className="shrink-0 font-medium tabular-nums text-foreground">
              {formatMoney(breakdown.staySubtotal)}
            </dd>
          </div>
          {breakdown.parkingSubtotal != null && breakdown.parkingNights != null ? (
            <div className="flex items-start justify-between gap-3">
              <dt>
                Parking ({nightLabel(breakdown.parkingNights)})
                <span className="mt-0.5 block text-xs">
                  {formatMoney(GUEST_PARKING_RATE_PER_NIGHT)} ×{' '}
                  {breakdown.parkingNights}
                </span>
              </dt>
              <dd className="shrink-0 font-medium tabular-nums text-foreground">
                {formatMoney(breakdown.parkingSubtotal)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-t border-primary/15 pt-2">
            <dt className="font-semibold text-foreground">Total due now</dt>
            <dd className="text-lg font-bold tabular-nums tracking-tight text-primary">
              {formatMoney(breakdown.total)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Pay via GCash</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            Scan the QR code or send to the account below, then upload your
            receipt.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 md:items-stretch">
          <div
            className="flex min-w-0 flex-col justify-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-5 sm:px-5 sm:py-6"
            aria-label="GCash account details"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                GCash Name
              </p>
              <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-semibold leading-snug text-foreground sm:text-lg">
                <span className="min-w-0 break-words">{gcashName}</span>
                <InlineCopyIconButton
                  aria-label="Copy GCash name to clipboard"
                  disabled={!gcashName}
                  onClick={() => void copyGcashName()}
                />
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                GCash Number
              </p>
              <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-semibold tabular-nums leading-snug text-foreground sm:text-lg">
                <span className="min-w-0 break-all">{gcashNumber}</span>
                <InlineCopyIconButton
                  aria-label="Copy GCash number to clipboard"
                  disabled={!gcashNumber}
                  onClick={() => void copyGcashNumber()}
                />
              </span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-card p-2 shadow-sm sm:p-3">
            <img
              src={GCASH_QR_SRC}
              alt="Kame Home GCash QR code — Book and Pay Here"
              className="h-auto w-full max-h-[min(70dvh,28rem)] object-contain"
              width={320}
              height={480}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
