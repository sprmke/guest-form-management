import { useMemo, useState } from 'react';

import { CalendarDays, Home, Loader2, MessageCircle, Search, Share2 } from 'lucide-react';

import {
  guestCalendarPath,
  guestMessagesPreviewPath,
  guestPropertyPath,
  guestReviewPath,
  guestSdFormPath,
} from '@/features/guest/lib/guestPublicPaths';

import { StatusBadge } from '@/features/dashboard/bookings/components/StatusBadge';
import { useBookingDocumentShareLink } from '@/features/dashboard/bookings/hooks/useBookingDocumentShareLink';
import { useBookingParkingShareLink } from '@/features/dashboard/bookings/hooks/useBookingParkingShareLink';
import { useBookings } from '@/features/dashboard/bookings/hooks/useBookings';
import { useBookingStayGuideLink } from '@/features/dashboard/bookings/hooks/useBookingStayGuideLink';
import { useOwnerDefaultParking } from '@/features/dashboard/bookings/hooks/useOwnerDefaultParking';
import { isStayGuideEligibleStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import { DEFAULT_BOOKINGS_QUERY, type BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  bookingGuestName,
  bookingSearchHaystack,
  bookingStayRange,
} from '@/features/dashboard/inbox/lib/inboxShareBookingItems';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SD_FORM_ELIGIBLE_STATUSES = new Set(['READY_FOR_CHECKOUT', 'PENDING_SD_REFUND', 'COMPLETED']);

type ShareRow = {
  key: string;
  label: string;
  icon?: typeof CalendarDays;
  url: string;
  pending?: boolean;
};

function ShareRowButton({ row, onSelect }: { row: ShareRow; onSelect: (url: string) => void }) {
  const Icon = row.icon;
  const disabled = row.pending || !row.url;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => row.url && onSelect(row.url)}
      className={cn(
        'native-press focus-visible:ring-ring flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
        'focus-visible:outline-none focus-visible:ring-2',
        disabled ? 'text-muted-foreground/60' : 'hover:bg-muted/60'
      )}
    >
      {Icon ? <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      {row.pending ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : null}
    </button>
  );
}

function BookingResultRow({
  row,
  selected,
  onSelect,
}: {
  row: BookingRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'native-press focus-visible:ring-ring flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 py-2 text-left',
        'focus-visible:outline-none focus-visible:ring-2',
        selected ? 'bg-primary/10' : 'hover:bg-muted/60'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-medium">
          {bookingGuestName(row)}
        </span>
        <span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-xs">
          <CalendarDays className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{bookingStayRange(row)}</span>
        </span>
      </span>
      <StatusBadge
        status={row.status}
        className="max-w-[8.5rem] shrink-0 px-1.5 py-0 text-[10px] font-semibold"
      />
    </button>
  );
}

type Props = {
  propertySlug: string;
  disabled?: boolean;
  onInsert: (url: string) => void;
};

/** Composer "Share" icon: quick-insert property/booking links for the guest in this conversation. */
export function InboxShareResourcesPicker({ propertySlug, disabled, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const { data, isLoading } = useBookings(
    { ...DEFAULT_BOOKINGS_QUERY, bookingKind: 'property', sort: 'check_in_date:desc', limit: 60 },
    { scope: 'property' }
  );
  const bookings = data?.rows ?? [];

  const needle = query.trim().toLowerCase();
  const filteredBookings = needle
    ? bookings.filter((row) => bookingSearchHaystack(row).toLowerCase().includes(needle))
    : bookings;

  const stayGuideLink = useBookingStayGuideLink(selectedBooking);
  const gafLink = useBookingDocumentShareLink(selectedBooking, 'gaf');
  const petLink = useBookingDocumentShareLink(selectedBooking, 'pet');
  const ownerDefaultQuery = useOwnerDefaultParking(selectedBooking?.id);
  const parkingShare = useBookingParkingShareLink(selectedBooking, ownerDefaultQuery.data);

  const propertyRows: ShareRow[] = useMemo(
    () => [
      {
        key: 'property',
        label: 'Property page',
        icon: Home,
        url: `${window.location.origin}${guestPropertyPath(propertySlug)}`,
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: CalendarDays,
        url: `${window.location.origin}${guestCalendarPath(propertySlug)}`,
      },
      {
        key: 'messages',
        label: 'Chat with host',
        icon: MessageCircle,
        url: `${window.location.origin}${guestMessagesPreviewPath(propertySlug)}`,
      },
    ],
    [propertySlug]
  );

  const bookingRows: ShareRow[] = useMemo(() => {
    if (!selectedBooking) return [];
    const rows: ShareRow[] = [];

    if (isStayGuideEligibleStatus(selectedBooking.status)) {
      rows.push({
        key: 'stay-guide',
        label: 'Stay Guide',
        url: stayGuideLink.url,
        pending: stayGuideLink.pending,
      });
    }
    if (selectedBooking.approved_gaf_pdf_url) {
      rows.push({
        key: 'gaf',
        label: 'Approved GAF',
        url: gafLink.url,
        pending: gafLink.pending,
      });
    }
    if (selectedBooking.approved_pet_pdf_url) {
      rows.push({
        key: 'pet',
        label: 'Approved Pet Form',
        url: petLink.url,
        pending: petLink.pending,
      });
    }
    if (selectedBooking.parking_endorsement_url) {
      rows.push({
        key: 'parking-endorsement',
        label: 'Parking Endorsement',
        url: selectedBooking.parking_endorsement_url,
      });
    }
    if (selectedBooking.need_parking && !(Number(selectedBooking.parking_rate_paid) > 0)) {
      rows.push({
        key: 'find-parking',
        label: parkingShare.isOwnDefault ? 'Use your parking' : 'Find parking',
        url: parkingShare.url,
        pending: ownerDefaultQuery.isLoading,
      });
    }
    if (SD_FORM_ELIGIBLE_STATUSES.has(String(selectedBooking.status))) {
      rows.push({
        key: 'sd-form',
        label: 'Security Deposit Refund',
        url: `${window.location.origin}${guestSdFormPath(propertySlug, selectedBooking.id)}`,
      });
    }
    if (selectedBooking.status === 'COMPLETED') {
      rows.push({
        key: 'review',
        label: 'Leave a Review',
        url: `${window.location.origin}${guestReviewPath(propertySlug, selectedBooking.id)}`,
      });
    }

    return rows;
  }, [
    selectedBooking,
    stayGuideLink,
    gafLink,
    petLink,
    propertySlug,
    parkingShare,
    ownerDefaultQuery.isLoading,
  ]);

  const selectUrl = (url: string) => {
    onInsert(url);
    setOpen(false);
    setQuery('');
    setSelectedBooking(null);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery('');
          setSelectedBooking(null);
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground size-10"
              disabled={disabled}
              aria-label="Share property or booking info"
            >
              <Share2 className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Share</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="top"
        className="w-[min(calc(100vw-2rem),24rem)] p-0"
        onWheel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="max-h-96 overflow-y-auto p-2">
          <p className="text-muted-foreground px-2 pb-1.5 pt-1 text-xs font-medium">Property</p>
          <div>
            {propertyRows.map((row) => (
              <ShareRowButton key={row.key} row={row} onSelect={selectUrl} />
            ))}
          </div>

          <p className="text-muted-foreground px-2 pb-1.5 pt-3 text-xs font-medium">Booking</p>
          {selectedBooking ? (
            <div className="mb-1.5">
              <BookingResultRow
                row={selectedBooking}
                selected
                onSelect={() => setSelectedBooking(null)}
              />
              {bookingRows.length > 0 ? (
                <div className="border-border/60 mt-1 border-t pt-1">
                  {bookingRows.map((row) => (
                    <ShareRowButton key={row.key} row={row} onSelect={selectUrl} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground px-2 py-2 text-xs">
                  Nothing shareable for this booking yet.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="relative px-1 pb-1.5">
                <Search
                  className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Guest, date, or status"
                  aria-label="Search bookings"
                  className="h-9 pl-8"
                />
              </div>
              {isLoading ? (
                <div className="space-y-1 p-1" aria-busy="true">
                  <Skeleton className="h-11 w-full rounded-lg" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <p className="text-muted-foreground px-2 py-4 text-center text-sm">No bookings</p>
              ) : (
                <div role="listbox" aria-label="Bookings" className="max-h-48 overflow-y-auto">
                  {filteredBookings.map((row) => (
                    <BookingResultRow
                      key={row.id}
                      row={row}
                      selected={false}
                      onSelect={() => setSelectedBooking(row)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
