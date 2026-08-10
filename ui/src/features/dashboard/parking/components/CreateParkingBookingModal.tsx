import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import { useOrgSlugParam } from '@/features/dashboard/org/lib/adminApiScope';
import { parkingBookingDetailPath } from '@/features/dashboard/org/lib/tenantPaths';
import { useCreateParkingBooking } from '@/features/dashboard/parking/hooks/useParkingBookingMutations';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { toGuestSubmissionDate } from '@/utils/format/dates';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, skip parking picker (parking-scoped page). */
  fixedParkingId?: string | null;
};

export function CreateParkingBookingModal({ open, onOpenChange, fixedParkingId }: Props) {
  const navigate = useNavigate();
  const orgSlug = useOrgSlugParam();
  const orgContext = useOptionalOrgContext();
  const parkingContext = useOptionalParkingContext();
  const parkingsQuery = useParkings(orgSlug ?? undefined);
  const create = useCreateParkingBooking();

  const defaultParkingId = fixedParkingId ?? parkingContext?.parking.id ?? '';
  const [parkingId, setParkingId] = useState(defaultParkingId);
  const [primaryGuestName, setPrimaryGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhoneNumber, setGuestPhoneNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [carPlateNumber, setCarPlateNumber] = useState('');
  const [carBrandModel, setCarBrandModel] = useState('');
  const [carColor, setCarColor] = useState('');

  const parkings = parkingsQuery.data?.parkings ?? [];
  const showParkingPicker = !fixedParkingId && !parkingContext;

  const resolvedOrgSlug = orgSlug ?? orgContext?.org.slug ?? parkingContext?.orgSlug ?? '';

  const canSubmit = useMemo(
    () =>
      Boolean(
        (parkingId || defaultParkingId) &&
        primaryGuestName.trim() &&
        guestEmail.trim() &&
        guestPhoneNumber.trim() &&
        checkInDate &&
        checkOutDate &&
        carPlateNumber.trim()
      ),
    [
      parkingId,
      defaultParkingId,
      primaryGuestName,
      guestEmail,
      guestPhoneNumber,
      checkInDate,
      checkOutDate,
      carPlateNumber,
    ]
  );

  const handleSubmit = async () => {
    const pid = parkingId || defaultParkingId;
    if (!pid || !canSubmit) return;

    const row = await create.mutateAsync({
      parkingId: pid,
      primaryGuestName: primaryGuestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhoneNumber: guestPhoneNumber.trim(),
      checkInDate: toGuestSubmissionDate(checkInDate),
      checkOutDate: toGuestSubmissionDate(checkOutDate),
      carPlateNumber: carPlateNumber.trim(),
      carBrandModel: carBrandModel.trim() || undefined,
      carColor: carColor.trim() || undefined,
    });

    onOpenChange(false);

    const parkingSlug =
      parkingContext?.parking.slug ??
      parkings.find((p) => p.id === pid)?.slug ??
      (row as { parking_slug?: string }).parking_slug;

    if (resolvedOrgSlug && parkingSlug && row?.id) {
      navigate(parkingBookingDetailPath(resolvedOrgSlug, parkingSlug, row.id));
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>New parking booking</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="space-y-4">
          {showParkingPicker ? (
            <div className="space-y-2">
              <Label htmlFor="parking-slot">Parking slot</Label>
              <select
                id="parking-slot"
                className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm"
                value={parkingId}
                onChange={(e) => setParkingId(e.target.value)}
              >
                <option value="">Select slot</option>
                {parkings.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="guest-name">Guest name</Label>
            <Input
              id="guest-name"
              value={primaryGuestName}
              onChange={(e) => setPrimaryGuestName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input
              id="guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Phone</Label>
            <Input
              id="guest-phone"
              value={guestPhoneNumber}
              onChange={(e) => setGuestPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="check-in">Check-in</Label>
              <Input
                id="check-in"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out">Check-out</Label>
              <Input
                id="check-out"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plate">Plate number</Label>
            <Input
              id="plate"
              value={carPlateNumber}
              onChange={(e) => setCarPlateNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="car-model">Brand / model</Label>
              <Input
                id="car-model"
                value={carBrandModel}
                onChange={(e) => setCarBrandModel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="car-color">Color</Label>
              <Input
                id="car-color"
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
              />
            </div>
          </div>
        </div>
        <ResponsiveModalFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || create.isPending} onClick={handleSubmit}>
            Create
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
