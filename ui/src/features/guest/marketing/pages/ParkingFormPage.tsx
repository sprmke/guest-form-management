import { useEffect, useState } from 'react';

import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';

import { toast } from 'sonner';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import { formatGuestFooterLabel } from '@/features/guest/form/lib/guestFormBranding';
import { guestParkingRequestStatusPath } from '@/features/guest/lib/guestPublicPaths';
import { FormSuccess } from '@/features/guest/marketing/forms/components/FormSuccess';
import { getFormById } from '@/features/guest/marketing/forms/data/mockForms';
import { ParkingRegistrationForm } from '@/features/guest/marketing/parkings/components/ParkingRegistrationForm';
import { usePublicParkingDetail } from '@/features/guest/marketing/parkings/hooks/usePublicParkingDetail';
import { useSubmitParkingBookingRequest } from '@/features/guest/marketing/parkings/hooks/useSubmitParkingBookingRequest';
import { formatParkingLocation } from '@/features/guest/marketing/parkings/lib/formatParkingLocation';
import type { ParkingRegistrationValues } from '@/features/guest/marketing/parkings/lib/parkingRegistrationSchema';

import { GuestFormBrandHeader } from '@/components/branding/GuestFormBrandHeader';
import { ParkingStaySummary } from '@/components/parking/ParkingStaySummary';
import { GuestFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { MainLayout } from '@/layouts/MainLayout';

const PARKING_REGISTRATION_FORM_ID = 'dev-parking-form';

/** Server error codes/messages mapped to guest-facing copy — anything unmapped falls back to a generic message. */
const GUEST_FACING_SUBMIT_ERRORS: Record<string, string> = {
  no_parking_available: 'No parking slots are available for these dates',
  'Parking not found': 'This parking listing is no longer available',
  'Organization not found': 'This parking listing is no longer available',
  'checkOutDate must be after checkInDate': 'Check-out date must be after check-in date',
};

export function ParkingFormPage() {
  const { parkingSlug = '' } = useParams<{ parkingSlug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { status: guestAuthStatus, requireGuestAuth } = useGuestAuth();
  const { data, isLoading, isError } = usePublicParkingDetail(parkingSlug);
  const form = getFormById(PARKING_REGISTRATION_FORM_ID);
  const submitRequest = useSubmitParkingBookingRequest();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | undefined>();

  const homeHref = parkingSlug ? `/parkings/${encodeURIComponent(parkingSlug)}` : '/parkings';

  // Same entry gate as property `/messages` and `/form`: require sign-in before the form is usable.
  useEffect(() => {
    if (guestAuthStatus !== 'anonymous') return;
    const to = `${location.pathname}${location.search}`;
    requireGuestAuth(() => undefined, {
      resume: { type: 'navigate', to },
    });
  }, [guestAuthStatus, requireGuestAuth, location.pathname, location.search]);

  if (!parkingSlug) {
    return <Navigate to="/parkings" replace />;
  }

  if (guestAuthStatus === 'loading' || guestAuthStatus === 'anonymous') {
    return (
      <MainLayout homeHref={homeHref}>
        <GuestFormPageSkeleton />
      </MainLayout>
    );
  }

  if (isLoading && !data) {
    return (
      <MainLayout homeHref={homeHref}>
        <GuestFormPageSkeleton />
      </MainLayout>
    );
  }

  if (isError || !data || !form) {
    return <Navigate to="/parkings" replace />;
  }

  const parkingLocation = formatParkingLocation(data.tower, data.level, data.slotLabel);
  const propertyLocation = [data.residenceName, parkingLocation].filter(Boolean).join(' · ');
  const checkInDate = searchParams.get('checkInDate') ?? '';
  const checkOutDate = searchParams.get('checkOutDate') ?? '';

  const handleSubmit = async (values: ParkingRegistrationValues) => {
    const vehicleType =
      values.vehicleType === 'motorcycle' ? ('motorcycle' as const) : ('car' as const);

    try {
      const result = await submitRequest.mutateAsync({
        parkingId: data.id,
        checkInDate: checkInDate || values.checkInDate,
        checkOutDate: checkOutDate || values.checkOutDate,
        vehicleType,
        primaryGuestName: values.guestName,
        guestEmail: values.email,
        guestPhone: values.phone,
        unitNumber: values.unitNumber,
        carPlateNumber: values.carPlateNumber,
        carBrandModel: values.carBrandModel,
        carColor: values.carColor,
        notes: values.notes,
      });
      setSubmissionId(result.bookingId);
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit parking request';
      toast.error(GUEST_FACING_SUBMIT_ERRORS[message] ?? 'Could not submit parking request');
    }
  };

  return (
    <MainLayout
      animateOnNavigate
      homeHref={homeHref}
      brandColor={data.brandColor}
      footerLabel={formatGuestFooterLabel(data.orgName, data.residenceName)}
      propertyImageSrc={data.coverImage ?? data.images[0] ?? null}
      propertyName={data.name}
      contentMaxWidth="max-w-2xl"
    >
      <div className="relative space-y-6 p-4 sm:p-6 lg:p-8">
        <GuestFormBrandHeader
          title="Parking Registration"
          logoSrc={data.coverImage ?? data.images[0] ?? ''}
          logoAlt={data.name}
          eyebrow={propertyLocation || data.orgName}
        />

        {checkInDate && checkOutDate && (
          <ParkingStaySummary
            checkIn={checkInDate}
            checkOut={checkOutDate}
            organizationName={data.orgName}
          />
        )}

        {isSubmitted ? (
          <FormSuccess
            message={form.settings.successMessage}
            formName={form.name}
            submissionId={submissionId}
            propertyId={parkingSlug}
            propertyName={data.name}
            statusUrl={submissionId ? guestParkingRequestStatusPath(submissionId) : undefined}
          />
        ) : (
          <ParkingRegistrationForm
            defaultValues={{ checkInDate, checkOutDate }}
            towerLabel={data.tower}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </MainLayout>
  );
}
