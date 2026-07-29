import { Users, UserRound } from 'lucide-react';

import { requiresValidId } from '@/features/guest/form/lib/guestCounts';

import { DocPreview } from '@/features/dashboard/bookings/components/booking-detail/BookingDocPreview';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import {
  BookingDetailRow,
  BookingDetailRowBlock,
  BookingDetailRowGroup,
} from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailRow';
import { receiptAiPreviewLoading } from '@/features/dashboard/bookings/hooks/useReceiptAiBackfill';
import {
  ADMIN_GUEST_VIEW_SLOTS,
  shouldShowAdminGuestViewSlot,
} from '@/features/dashboard/bookings/lib/adminGuestSlots';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { cn } from '@/lib/utils';

type PreviewHandler = (label: string, rawUrl: string) => void;

export function GuestsPanel({
  booking,
  onPreview,
  isDocumentAiBackfilling = false,
}: {
  booking: BookingRow;
  onPreview: PreviewHandler;
  isDocumentAiBackfilling?: boolean;
}) {
  const visibleSlots = ADMIN_GUEST_VIEW_SLOTS.filter((slot) =>
    shouldShowAdminGuestViewSlot(slot, booking)
  );

  if (visibleSlots.length === 0) {
    return (
      <BookingDetailCard title="Guests" icon={Users}>
        <BookingDetailRowBlock>
          <p className="text-muted-foreground text-sm">No additional guests on this booking.</p>
        </BookingDetailRowBlock>
      </BookingDetailCard>
    );
  }

  return (
    <BookingDetailCard title="Guests" icon={Users}>
      {visibleSlots.map((slot, index) => {
        const name = booking[slot.nameKey];
        const age = booking[slot.ageKey];
        const validIdUrl = booking[slot.validIdUrlKey];
        const showValidId = age != null && !Number.isNaN(age) && requiresValidId(age);

        return (
          <BookingDetailRowBlock
            key={slot.index}
            className={cn(index > 0 && 'border-border/60 border-t')}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                <UserRound className="size-4" aria-hidden />
              </span>
              <p className="text-foreground text-sm font-bold">
                {slot.index}. {slot.label} guest
              </p>
            </div>
            <BookingDetailRowGroup>
              <BookingDetailRow label="Name" value={name} />
              <BookingDetailRow label="Age" value={age != null ? String(age) : undefined} />
            </BookingDetailRowGroup>
            {showValidId ? (
              <div className="mt-3">
                {validIdUrl ? (
                  <DocPreview
                    label={`${slot.label} valid ID`}
                    url={validIdUrl}
                    onPreview={onPreview}
                    receiptAiVerdict={
                      slot.validIdAiVerdictKey ? booking[slot.validIdAiVerdictKey] : undefined
                    }
                    receiptAiLoading={
                      slot.validIdAiVerdictKey
                        ? receiptAiPreviewLoading(
                            isDocumentAiBackfilling,
                            validIdUrl,
                            booking[slot.validIdAiVerdictKey]
                          )
                        : false
                    }
                    receiptAiVariant="valid_id"
                  />
                ) : (
                  <p className="text-muted-foreground border-border/70 rounded-lg border border-dashed px-3 py-2.5 text-xs">
                    No valid ID uploaded
                  </p>
                )}
              </div>
            ) : null}
          </BookingDetailRowBlock>
        );
      })}
    </BookingDetailCard>
  );
}
