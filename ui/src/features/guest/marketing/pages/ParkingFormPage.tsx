import { Navigate, useParams } from 'react-router-dom';

import { FormPageWrapper } from '@/features/guest/marketing/forms/components';
import { getFormById } from '@/features/guest/marketing/forms/data/mockForms';
import { formatParkingLocation } from '@/features/guest/marketing/parkings/lib/formatParkingLocation';
import { usePublicParkingDetail } from '@/features/guest/marketing/parkings/hooks/usePublicParkingDetail';

import { GuestFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';

const PARKING_REGISTRATION_FORM_ID = 'dev-parking-form';

export function ParkingFormPage() {
  const { parkingSlug = '' } = useParams<{ parkingSlug: string }>();
  const { data, isLoading, isError } = usePublicParkingDetail(parkingSlug);
  const form = getFormById(PARKING_REGISTRATION_FORM_ID);

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
    />
  );
}
