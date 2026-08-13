import { ImageOff, Loader2, ScanSearch } from 'lucide-react';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  ReceiptAiVerdictMark,
  receiptAiVerdictReportTextClass,
  type ReceiptAiVerdict,
} from '@/features/dashboard/bookings/components/ReceiptAiVerdictBadge';
import { useBookingAiReview } from '@/features/dashboard/bookings/hooks/useBookingAiReview';
import { hasBookingAiReviewRun } from '@/features/dashboard/bookings/lib/bookingAiReviewProgress';
import {
  collectBookingAiValidations,
  sortBookingAiValidations,
} from '@/features/dashboard/bookings/lib/bookingAiValidations';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { softBadgeClasses } from '@/lib/statusToneColors';
import { cn } from '@/lib/utils';

type PreviewHandler = (label: string, rawUrl: string) => void;

/** Verdicts `ReceiptAiVerdictMark` renders — anything else has no mark to show. */
const BADGED_VERDICTS = new Set(['valid', 'likely_valid', 'unclear', 'invalid']);

/** Status text for rows with no verdict mark (queued, skipped, or unrecognized). */
function pendingLabel(verdict: ReceiptAiVerdict, loading: boolean): string {
  if (loading) return 'Checking';
  return BADGED_VERDICTS.has(String(verdict ?? '').toLowerCase()) ? '' : 'Not checked';
}

/**
 * Per-document AI verdicts from Overview. Hidden until an admin runs AI Summary —
 * never auto-checks on page view (token cost).
 */
export function AiValidationPanel({
  booking,
  onPreview,
  isDocumentAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
  isDocumentAiBackfilling?: boolean;
}) {
  const { data: review } = useBookingAiReview(booking.id);
  if (!hasBookingAiReviewRun(review)) return null;

  const items = sortBookingAiValidations(
    collectBookingAiValidations(booking, isDocumentAiBackfilling)
  );
  const invalidCount = items.filter(
    (i) => String(i.verdict ?? '').toLowerCase() === 'invalid'
  ).length;

  return (
    <BookingDetailCard
      title="Document checks"
      icon={ScanSearch}
      action={
        invalidCount > 0 ? (
          <span className={cn(softBadgeClasses('danger'), 'font-semibold')}>
            {invalidCount} to review
          </span>
        ) : null
      }
      bodyClassName="!px-0"
    >
      {items.length === 0 ? (
        <p className="text-muted-foreground px-4 py-4 text-sm sm:px-5">
          Checks run once a receipt or ID is uploaded.
        </p>
      ) : (
        <ul className="divide-border/60 divide-y" aria-label="Document check results">
          {items.map((item) => {
            const pending = pendingLabel(item.verdict, item.loading);
            const canOpen = Boolean(item.url);

            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                {canOpen ? (
                  <DocPreview compact label={item.label} url={item.url!} onPreview={onPreview} />
                ) : (
                  <span
                    className="border-border text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed sm:size-16"
                    title="No file stored for this check"
                    aria-hidden
                  >
                    <ImageOff className="size-4" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => onPreview(item.label, item.url!)}
                      className="text-foreground hover:text-primary block min-w-0 truncate text-left text-sm font-medium transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <p className="text-foreground min-w-0 truncate text-sm font-medium">
                      {item.label}
                    </p>
                  )}

                  {item.summary ? (
                    <p
                      className={cn(
                        'mt-1 line-clamp-3 text-xs leading-relaxed [overflow-wrap:anywhere]',
                        receiptAiVerdictReportTextClass(item.verdict, item.loading)
                      )}
                    >
                      {item.summary}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-center self-center">
                  {item.loading ? (
                    <Loader2
                      className="text-muted-foreground size-5 animate-spin motion-reduce:animate-none"
                      aria-label={`Checking ${item.label}`}
                    />
                  ) : pending ? (
                    <span className="text-muted-foreground text-[11px] font-medium">{pending}</span>
                  ) : (
                    <ReceiptAiVerdictMark verdict={item.verdict} size="md" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </BookingDetailCard>
  );
}
