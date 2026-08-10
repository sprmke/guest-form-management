import { FileText } from 'lucide-react';

import { normalizeBookingSource } from '@/features/guest/form/lib/bookingSourceFromSearchParams';

import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import { BookingGuestDocReplacer } from '@/features/dashboard/bookings/components/BookingGuestDocReplacer';
import type { GuestDocAssetType } from '@/features/dashboard/bookings/hooks/useUploadBookingAsset';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

type DocDef = {
  assetType: GuestDocAssetType;
  label: string;
  currentUrl: string | null | undefined;
  accept: string;
};

type Props = {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
  watchHasPets?: boolean;
  watchBookingSource?: string;
};

/** Whether the Files tab should be offered at all — same rule as the doc list below. */
export function shouldShowDocumentsTab(
  bookingSource: string | null | undefined,
  watchBookingSource: string | undefined,
  watchHasPets: boolean | undefined
): boolean {
  const isAirbnb = normalizeBookingSource(watchBookingSource ?? bookingSource) === 'Airbnb';
  return !isAirbnb || !!watchHasPets;
}

export function DocumentsTab({ booking, onPreview, watchHasPets, watchBookingSource }: Props) {
  const isAirbnb =
    normalizeBookingSource(watchBookingSource ?? booking.booking_source) === 'Airbnb';
  const hasPets = watchHasPets ?? booking.has_pets ?? false;

  const docs: DocDef[] = [
    ...(!isAirbnb
      ? ([
          {
            assetType: 'payment_receipt',
            label: 'Downpayment receipt',
            currentUrl: booking.payment_receipt_url,
            accept: 'image/*,.pdf',
          },
        ] as DocDef[])
      : []),
    ...(hasPets
      ? ([
          {
            assetType: 'pet_vaccination',
            label: 'Vaccination record',
            currentUrl: booking.pet_vaccination_url,
            accept: 'image/*,.pdf',
          },
          {
            assetType: 'pet_image',
            label: 'Pet photo',
            currentUrl: booking.pet_image_url,
            accept: 'image/*',
          },
        ] as DocDef[])
      : []),
  ];

  return (
    <BookingDetailCard title="Files" icon={FileText} tone="edit">
      {docs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No replaceable files for this booking.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {docs.map((doc) => (
            <BookingGuestDocReplacer
              key={doc.assetType}
              bookingId={booking.id}
              onPreview={onPreview}
              {...doc}
            />
          ))}
        </div>
      )}
    </BookingDetailCard>
  );
}
