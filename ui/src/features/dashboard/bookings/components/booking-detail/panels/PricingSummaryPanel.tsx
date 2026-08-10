import { Receipt, Sparkles, Ticket } from 'lucide-react';

import { isStaycationVoucher } from '@/features/guest/sd-form/lib/voucher';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import { BookingDetailRowBlock } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import { BookingPricingSummary } from '@/features/dashboard/bookings/components/BookingPricingSummary';
import { receiptAiPreviewLoading } from '@/features/dashboard/bookings/hooks/useReceiptAiBackfill';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { formatRelative } from '@/utils/format/bookingDisplay';
import { formatMoney } from '@/utils/format/currency';

type PreviewHandler = (label: string, rawUrl: string) => void;

function NextStayVoucherBlock({ booking }: { booking: BookingRow }) {
  const code = booking.next_stay_voucher_code;
  if (!code) return null;
  const amountRaw = booking.next_stay_voucher_amount;
  const amount =
    amountRaw == null ? null : typeof amountRaw === 'string' ? Number(amountRaw) : amountRaw;
  const awardedAt = booking.next_stay_voucher_awarded_at;

  return (
    <BookingDetailRowBlock className="border-border/60 border-t">
      <p className="text-overline mb-2">Next-stay voucher</p>
      <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 px-4 py-3 ring-1 ring-emerald-100/80">
        <Sparkles className="absolute right-3 top-3 size-4 text-emerald-500/70" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Ticket className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-emerald-950 sm:text-base">
              {code}
            </p>
            <p className="text-caption mt-0.5 text-emerald-900/70">
              {isStaycationVoucher({ code })
                ? 'Free staycation on the next booking'
                : amount != null
                  ? `${formatMoney(amount)} off the next booking`
                  : '—'}
              {awardedAt ? (
                <>
                  {' · '}
                  <span title={awardedAt}>awarded {formatRelative(awardedAt)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </BookingDetailRowBlock>
  );
}

export function PricingSummaryPanel({
  booking,
  onPreview,
  isReceiptAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
  isReceiptAiBackfilling?: boolean;
}) {
  if (booking.status === 'PENDING_REVIEW') return null;

  const isCompleted = booking.status === 'COMPLETED';
  const hasPaymentReceipt = Boolean(booking.payment_receipt_url?.trim());
  const hasBalanceReceipt = Boolean(booking.guest_balance_payment_receipt_url?.trim());

  return (
    <BookingDetailCard title="Pricing" icon={Receipt}>
      <BookingDetailRowBlock className="py-0 pb-3.5">
        <BookingPricingSummary booking={booking} layout="page" />
      </BookingDetailRowBlock>

      {(hasPaymentReceipt || hasBalanceReceipt) && (
        <BookingDetailRowBlock className="border-border/60 border-t">
          <p className="text-overline mb-2">Payment receipts</p>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hasPaymentReceipt ? (
              <DocPreview
                label="Downpayment receipt"
                url={booking.payment_receipt_url!.trim()}
                onPreview={onPreview}
                receiptAiVerdict={booking.dp_receipt_ai_verdict}
                receiptAiLoading={receiptAiPreviewLoading(
                  isReceiptAiBackfilling,
                  booking.payment_receipt_url,
                  booking.dp_receipt_ai_verdict
                )}
              />
            ) : null}
            {hasBalanceReceipt ? (
              <DocPreview
                label="Payment balance receipt"
                url={booking.guest_balance_payment_receipt_url!.trim()}
                onPreview={onPreview}
                receiptAiVerdict={booking.balance_receipt_ai_verdict}
                receiptAiLoading={receiptAiPreviewLoading(
                  isReceiptAiBackfilling,
                  booking.guest_balance_payment_receipt_url,
                  booking.balance_receipt_ai_verdict
                )}
              />
            ) : null}
          </div>
        </BookingDetailRowBlock>
      )}

      {isCompleted && booking.next_stay_voucher_code ? (
        <NextStayVoucherBlock booking={booking} />
      ) : null}

      {isCompleted && booking.sd_refund_receipt_url ? (
        <BookingDetailRowBlock className="border-border/60 border-t">
          <p className="text-overline mb-2">Refund receipt</p>
          <DocPreview
            label="SD refund receipt"
            url={booking.sd_refund_receipt_url}
            onPreview={onPreview}
          />
        </BookingDetailRowBlock>
      ) : null}
    </BookingDetailCard>
  );
}
