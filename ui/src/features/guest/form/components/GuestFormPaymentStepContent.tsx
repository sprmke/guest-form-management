import { useCallback, useMemo } from 'react';

import { toast } from 'sonner';

import {
  useGuestPaymentInfo,
  type GuestPaymentMethod,
} from '@/features/guest/form/hooks/useGuestPaymentInfo';
import {
  computeGuestFormPaymentBreakdown,
  GUEST_DOWN_PAYMENT_RATE_PER_NIGHT,
  GUEST_PARKING_RATE_PER_NIGHT,
} from '@/features/guest/form/lib/guestFormPayment';
import type { GuestFormData } from '@/features/guest/form/schemas/guestFormSchema';

import { InlineCopyIconButton } from '@/features/dashboard/bookings/components/InlineCopyIconButton';
import {
  DEFAULT_PAYMENT_PROVIDER,
  normalizePaymentProvider,
  paymentAccountNumberLabel,
  paymentQrAltText,
  paymentSectionTitle,
} from '@/features/dashboard/org/lib/paymentProviders';

import { formatMoney } from '@/utils/format/currency';

import type { UseFormReturn } from 'react-hook-form';

const DEFAULT_PAYMENT_QR_SRC = '/images/kame-home-gcash-qr-payment.jpg';

function PaymentMethodCard({
  method,
  qrFallback,
}: {
  method: GuestPaymentMethod;
  qrFallback: string;
}) {
  const paymentProvider = normalizePaymentProvider(method.provider);
  const accountName = method.accountName;
  const accountNumber = method.accountNumber;
  const paymentQrSrc = method.qrImageUrl || qrFallback;
  const accountNumberLabel = paymentAccountNumberLabel(paymentProvider);
  const payTitle = paymentSectionTitle(paymentProvider);

  const copyAccountName = useCallback(async () => {
    if (!accountName) return;
    try {
      await navigator.clipboard.writeText(accountName);
      toast.success('Account name copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [accountName]);

  const copyAccountNumber = useCallback(async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success('Account Number copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [accountNumber]);

  return (
    <div className="space-y-3">
      <p className="text-foreground text-sm font-semibold">{payTitle}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch md:gap-5">
        <div
          className="border-border/60 bg-card flex min-w-0 flex-col justify-center gap-4 rounded-xl border px-4 py-5 sm:px-5 sm:py-6"
          aria-label={`${paymentProvider} account details`}
        >
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Account name
            </p>
            <span className="text-foreground inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-semibold leading-snug sm:text-lg">
              <span className="min-w-0 break-words">{accountName}</span>
              <InlineCopyIconButton
                aria-label="Copy account name to clipboard"
                disabled={!accountName}
                onClick={() => void copyAccountName()}
              />
            </span>
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {accountNumberLabel}
            </p>
            <span className="text-foreground inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-semibold tabular-nums leading-snug sm:text-lg">
              <span className="min-w-0 break-all">{accountNumber}</span>
              <InlineCopyIconButton
                aria-label="Copy account number to clipboard"
                disabled={!accountNumber}
                onClick={() => void copyAccountNumber()}
              />
            </span>
          </div>
        </div>

        <div className="border-border/60 bg-card flex min-w-0 items-center justify-center overflow-hidden rounded-xl border p-2 shadow-sm sm:p-3">
          <img
            src={paymentQrSrc}
            alt={paymentQrAltText(paymentProvider)}
            className="h-auto max-h-[min(70dvh,28rem)] w-full object-contain"
            width={320}
            height={480}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

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
    ]
  );

  const paymentMethods = paymentInfo?.paymentMethods?.length
    ? paymentInfo.paymentMethods
    : paymentInfo?.gcashName || paymentInfo?.gcashNumber
      ? [
          {
            id: 'legacy',
            provider: paymentInfo?.paymentProvider ?? DEFAULT_PAYMENT_PROVIDER,
            accountName: paymentInfo?.gcashName ?? '',
            accountNumber: paymentInfo?.gcashNumber ?? '',
            qrImageUrl: paymentInfo?.gcashQrImageUrl ?? null,
            isPrimary: true,
          },
        ]
      : [];
  const qrFallback = paymentInfo?.gcashQrImageUrl || DEFAULT_PAYMENT_QR_SRC;
  const orderedMethods = [
    ...paymentMethods.filter((m) => m.isPrimary),
    ...paymentMethods.filter((m) => !m.isPrimary),
  ];

  return (
    <div className="space-y-4">
      <div
        className="border-primary/15 bg-primary/5 space-y-3 rounded-xl border px-4 py-3 text-sm"
        role="group"
        aria-label="Payment breakdown"
      >
        <p className="text-foreground font-semibold">Payment breakdown</p>
        <dl className="text-muted-foreground space-y-2">
          <div className="flex items-start justify-between gap-3">
            <dt>
              Downpayment ({nightLabel(breakdown.stayNights)})
              <span className="mt-0.5 block text-xs">
                {formatMoney(GUEST_DOWN_PAYMENT_RATE_PER_NIGHT)} × {breakdown.stayNights}
              </span>
            </dt>
            <dd className="text-foreground shrink-0 font-medium tabular-nums">
              {formatMoney(breakdown.staySubtotal)}
            </dd>
          </div>
          {breakdown.parkingSubtotal != null && breakdown.parkingNights != null ? (
            <div className="flex items-start justify-between gap-3">
              <dt>
                Parking ({nightLabel(breakdown.parkingNights)})
                <span className="mt-0.5 block text-xs">
                  {formatMoney(GUEST_PARKING_RATE_PER_NIGHT)} × {breakdown.parkingNights}
                </span>
              </dt>
              <dd className="text-foreground shrink-0 font-medium tabular-nums">
                {formatMoney(breakdown.parkingSubtotal)}
              </dd>
            </div>
          ) : null}
          <div className="border-primary/15 flex items-center justify-between gap-3 border-t pt-2">
            <dt className="text-foreground font-semibold">Total due now</dt>
            <dd className="text-primary text-lg font-bold tabular-nums tracking-tight">
              {formatMoney(breakdown.total)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        {orderedMethods.length > 0
          ? orderedMethods.map((method) => (
              <PaymentMethodCard key={method.id} method={method} qrFallback={qrFallback} />
            ))
          : null}
      </div>
    </div>
  );
}
