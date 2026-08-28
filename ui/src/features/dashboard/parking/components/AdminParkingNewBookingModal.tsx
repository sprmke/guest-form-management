import { useCallback, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { Car, CalendarDays, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

import { ParkingRegistrationForm } from '@/features/guest/marketing/parkings/components/ParkingRegistrationForm';
import { useSubmitParkingBookingRequest } from '@/features/guest/marketing/parkings/hooks/useSubmitParkingBookingRequest';
import type { ParkingRegistrationValues } from '@/features/guest/marketing/parkings/lib/parkingRegistrationSchema';
import { GuestDialogShell } from '@/features/guest/marketing/shared/components/GuestDialogShell';

import {
  AdminBookingSuccessSummary,
  type AdminBookingSuccessRow,
} from '@/features/dashboard/bookings/components/AdminBookingSuccessSummary';
import { BOOKINGS_QUERY_KEY } from '@/features/dashboard/bookings/hooks/useBookings';
import { parkingBookingDetailPath } from '@/features/dashboard/org/lib/tenantPaths';

import { DialogTitle } from '@/components/ui/dialog';
import { formatDateToLongFormat } from '@/utils/format/dates';

/** Server error codes/messages mapped to admin-facing copy — mirrors the public parking modal. */
const SUBMIT_ERROR_MESSAGES: Record<string, string> = {
  no_parking_available: 'No parking slots are available for these dates',
  'Parking not found': 'This parking listing is no longer available',
  'Organization not found': 'This parking listing is no longer available',
  'checkOutDate must be after checkInDate': 'Check-out date must be after check-in date',
};

export interface AdminParkingNewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string | null;
  parkingSlug: string | null;
  parkingId: string;
  towerLabel?: string | null;
}

type ParkingBookingResult = {
  bookingId: string;
  values: ParkingRegistrationValues;
};

function toSuccessRows(values: ParkingRegistrationValues): AdminBookingSuccessRow[] {
  return [
    {
      icon: CalendarDays,
      label: 'Parking dates',
      value: `${formatDateToLongFormat(values.checkInDate)} — ${formatDateToLongFormat(values.checkOutDate)}`,
    },
    { icon: User, label: 'Guest', value: values.guestName },
    { icon: Mail, label: 'Email', value: values.email },
    { icon: Phone, label: 'Phone', value: values.phone },
    {
      icon: Car,
      label: 'Vehicle',
      value: `${values.carPlateNumber} — ${values.carBrandModel} (${values.carColor})`,
    },
  ];
}

export function AdminParkingNewBookingModal({
  open,
  onOpenChange,
  orgSlug,
  parkingSlug,
  parkingId,
  towerLabel,
}: AdminParkingNewBookingModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitRequest = useSubmitParkingBookingRequest();

  const [view, setView] = useState<'form' | 'success'>('form');
  const [result, setResult] = useState<ParkingBookingResult | null>(null);
  const [formKey, setFormKey] = useState(0);

  const resetState = useCallback(() => {
    setView('form');
    setResult(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState();
      onOpenChange(next);
    },
    [onOpenChange, resetState]
  );

  const handleSubmit = useCallback(
    async (values: ParkingRegistrationValues) => {
      try {
        const submitResult = await submitRequest.mutateAsync({
          parkingId,
          checkInDate: values.checkInDate,
          checkOutDate: values.checkOutDate,
          vehicleType: values.vehicleType,
          primaryGuestName: values.guestName,
          guestEmail: values.email,
          guestPhone: values.phone,
          unitNumber: values.unitNumber,
          carPlateNumber: values.carPlateNumber,
          carBrandModel: values.carBrandModel,
          carColor: values.carColor,
          notes: values.notes,
        });
        void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
        setResult({ bookingId: submitResult.bookingId, values });
        setView('success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not submit parking request';
        toast.error(SUBMIT_ERROR_MESSAGES[message] ?? 'Could not submit parking request');
      }
    },
    [parkingId, queryClient, submitRequest]
  );

  const handleAddAnother = useCallback(() => {
    setView('form');
    setResult(null);
    setFormKey((key) => key + 1);
  }, []);

  const handleViewBooking = useCallback(() => {
    if (!result || !orgSlug || !parkingSlug) return;
    onOpenChange(false);
    navigate(parkingBookingDetailPath(orgSlug, parkingSlug, result.bookingId));
  }, [navigate, onOpenChange, orgSlug, parkingSlug, result]);

  return (
    <GuestDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <DialogTitle className="text-foreground text-base font-semibold">New booking</DialogTitle>
      }
      sizeClassName="max-w-[min(calc(100vw-1.5rem),36rem)] sm:max-w-[min(90vw,40rem)]"
      heightClassName="max-h-[min(92dvh,48rem)]"
      bodyClassName="px-5 py-4 sm:px-6"
    >
      {view === 'success' && result ? (
        <AdminBookingSuccessSummary
          title="Booking created"
          rows={toSuccessRows(result.values)}
          onAddAnother={handleAddAnother}
          onViewBooking={handleViewBooking}
        />
      ) : open ? (
        <ParkingRegistrationForm key={formKey} towerLabel={towerLabel} onSubmit={handleSubmit} />
      ) : null}
    </GuestDialogShell>
  );
}
