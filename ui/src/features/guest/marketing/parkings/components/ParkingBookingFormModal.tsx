import { useNavigate } from 'react-router-dom';

import { Car } from 'lucide-react';
import { toast } from 'sonner';

import { guestParkingRequestStatusPath } from '@/features/guest/lib/guestPublicPaths';
import { ParkingRegistrationForm } from '@/features/guest/marketing/parkings/components/ParkingRegistrationForm';
import { useSubmitParkingBookingRequest } from '@/features/guest/marketing/parkings/hooks/useSubmitParkingBookingRequest';
import type { ParkingRegistrationValues } from '@/features/guest/marketing/parkings/lib/parkingRegistrationSchema';
import { GuestDialogShell } from '@/features/guest/marketing/shared/components/GuestDialogShell';

import { DialogTitle } from '@/components/ui/dialog';
import { dateToString } from '@/utils/format/dates';

/** Server error codes/messages mapped to guest-facing copy — anything unmapped falls back to a generic message. */
const GUEST_FACING_SUBMIT_ERRORS: Record<string, string> = {
  no_parking_available: 'No parking slots are available for these dates',
  'Parking not found': 'This parking listing is no longer available',
  'Organization not found': 'This parking listing is no longer available',
  'checkOutDate must be after checkInDate': 'Check-out date must be after check-in date',
};

export interface ParkingBookingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingId: string;
  /** Read-only tower/building label shown beside Unit Number, when known for this slot. */
  towerLabel?: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
}

export function ParkingBookingFormModal({
  open,
  onOpenChange,
  parkingId,
  towerLabel,
  checkIn,
  checkOut,
}: ParkingBookingFormModalProps) {
  const navigate = useNavigate();
  const submitRequest = useSubmitParkingBookingRequest();

  const checkInDate = checkIn ? dateToString(checkIn) : '';
  const checkOutDate = checkOut ? dateToString(checkOut) : '';
  const formKey = `${parkingId}:${checkInDate}:${checkOutDate}`;

  const handleSubmit = async (values: ParkingRegistrationValues) => {
    const vehicleType =
      values.vehicleType === 'motorcycle' ? ('motorcycle' as const) : ('car' as const);

    try {
      const result = await submitRequest.mutateAsync({
        parkingId,
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
      onOpenChange(false);
      navigate(guestParkingRequestStatusPath(result.bookingId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit parking request';
      toast.error(GUEST_FACING_SUBMIT_ERRORS[message] ?? 'Could not submit parking request');
    }
  };

  return (
    <GuestDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            <Car className="text-primary h-3.5 w-3.5" />
          </div>
          <DialogTitle className="text-foreground text-base font-semibold">
            Parking Registration
          </DialogTitle>
        </div>
      }
      sizeClassName="max-w-[min(calc(100vw-1.5rem),36rem)] sm:max-w-[min(90vw,40rem)]"
      heightClassName="max-h-[min(92dvh,48rem)]"
      bodyClassName="px-5 py-4 sm:px-6"
    >
      {open ? (
        <ParkingRegistrationForm
          key={formKey}
          defaultValues={{ checkInDate, checkOutDate }}
          towerLabel={towerLabel}
          onSubmit={handleSubmit}
        />
      ) : null}
    </GuestDialogShell>
  );
}
