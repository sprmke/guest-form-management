import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { toast } from 'sonner';

import { guestParkingRequestStatusPath } from '@/features/guest/lib/guestPublicPaths';
import { FormPageWrapper } from '@/features/guest/marketing/forms/components';
import { getFormById } from '@/features/guest/marketing/forms/data/mockForms';
import { usePublicParkingDetail } from '@/features/guest/marketing/parkings/hooks/usePublicParkingDetail';
import { useSubmitParkingBookingRequest } from '@/features/guest/marketing/parkings/hooks/useSubmitParkingBookingRequest';
import { formatParkingLocation } from '@/features/guest/marketing/parkings/lib/formatParkingLocation';

import { GuestFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';

const PARKING_REGISTRATION_FORM_ID = 'dev-parking-form';

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function ParkingFormPage() {
  const { parkingSlug = '' } = useParams<{ parkingSlug: string }>();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = usePublicParkingDetail(parkingSlug);
  const form = getFormById(PARKING_REGISTRATION_FORM_ID);
  const submitRequest = useSubmitParkingBookingRequest();

  if (!parkingSlug) {
    return <Navigate to="/parkings" replace />;
  }

  if (isLoading && !data) {
    return <GuestFormPageSkeleton title="Parking registration" />;
  }

  if (isError || !data || !form) {
    return <Navigate to="/parkings" replace />;
  }

  const location = formatParkingLocation(data.tower, data.level, data.slotLabel);
  const propertyLocation = [data.residenceName, location].filter(Boolean).join(' · ');

  const handleSubmit = async (fieldData: Record<string, unknown>) => {
    const checkInDate =
      searchParams.get('checkInDate') || readString(fieldData, 'field-po-checkin');
    const checkOutDate =
      searchParams.get('checkOutDate') || readString(fieldData, 'field-po-checkout');
    const vehicleType =
      readString(fieldData, 'field-po-vehicle-type') === 'motorcycle'
        ? ('motorcycle' as const)
        : ('car' as const);

    try {
      const result = await submitRequest.mutateAsync({
        parkingId: data.id,
        checkInDate,
        checkOutDate,
        vehicleType,
        primaryGuestName: readString(fieldData, 'field-po-guest-name'),
        guestEmail: readString(fieldData, 'field-po-email'),
        guestPhone: readString(fieldData, 'field-po-phone'),
      });
      return { submissionId: result.bookingId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit parking request';
      toast.error(
        message === 'no_parking_available'
          ? 'No parking slots are available for these dates'
          : message
      );
      throw error;
    }
  };

  return (
    <FormPageWrapper
      form={form}
      propertyId={parkingSlug}
      propertyName={data.name}
      propertyLocation={propertyLocation || data.orgName}
      propertyImage={data.coverImage ?? data.images[0] ?? ''}
      hostName={data.orgName}
      backUrl={`/parkings/${encodeURIComponent(parkingSlug)}`}
      backLabel="Back to parking"
      sourceType="development"
      onSubmit={handleSubmit}
      buildStatusUrl={guestParkingRequestStatusPath}
    />
  );
}
