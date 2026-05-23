import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Car, Copy, ExternalLink, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { useSaveParkingRateGuest } from '@/features/admin/hooks/useSaveParkingRateGuest';
import type { BookingRow } from '@/features/admin/lib/types';
import {
  formatBookingDate,
  formatMoney,
} from '@/features/admin/lib/formatters';
import {
  buildPayParkingAbsoluteUrl,
  buildPayParkingPath,
} from '@/features/pay-parking/lib/api';
import {
  bookingDateToMmDdYyyy,
  bookingStayDateRange,
  canCustomizeParkingDates,
  countParkingNights,
  defaultParkingCheckOutAfterCheckIn,
  defaultParkingDateRange,
  defaultParkingRateGuest,
  hasPayParkingAvailed,
  parseBookingStayDate,
  parkingUsesBookingStayDates,
} from '@/features/pay-parking/lib/payParkingHelpers';

type Props = {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function resolveStayBounds(booking: BookingRow) {
  const minDate = parseBookingStayDate(booking.check_in_date);
  const maxDate = parseBookingStayDate(booking.check_out_date);
  if (!minDate || !maxDate) {
    const today = new Date();
    return { minDate: today, maxDate: today };
  }
  return { minDate, maxDate };
}

export function PayParkingModal({ booking, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const saveRateMut = useSaveParkingRateGuest();
  const [rate, setRate] = useState(() => defaultParkingRateGuest(booking));
  const [parkingCheckIn, setParkingCheckIn] = useState<Date | undefined>(
    () => defaultParkingDateRange(booking).from,
  );
  const [parkingCheckOut, setParkingCheckOut] = useState<Date | undefined>(
    () => defaultParkingDateRange(booking).to,
  );
  const [sameAsBookingDuration, setSameAsBookingDuration] = useState(() =>
    parkingUsesBookingStayDates(booking),
  );

  const stayBounds = useMemo(() => resolveStayBounds(booking), [booking]);
  const bookingStayRange = useMemo(
    () => bookingStayDateRange(booking),
    [booking],
  );
  const allowCustomParkingDates = useMemo(
    () => canCustomizeParkingDates(booking),
    [booking],
  );
  const usesBookingStayDates =
    !allowCustomParkingDates || sameAsBookingDuration;

  useEffect(() => {
    if (open) {
      setRate(defaultParkingRateGuest(booking));
      const canCustomize = canCustomizeParkingDates(booking);
      const useStay = !canCustomize || parkingUsesBookingStayDates(booking);
      setSameAsBookingDuration(useStay);
      const range = useStay
        ? bookingStayDateRange(booking)
        : defaultParkingDateRange(booking);
      setParkingCheckIn(range.from);
      setParkingCheckOut(range.to);
    }
  }, [open, booking]);

  const viewMode = hasPayParkingAvailed(booking);
  const isSaving = saveRateMut.isPending;

  const parkingNights = useMemo(() => {
    const checkIn = usesBookingStayDates
      ? bookingStayRange.from
      : parkingCheckIn;
    const checkOut = usesBookingStayDates
      ? bookingStayRange.to
      : parkingCheckOut;
    if (!checkIn || !checkOut) return 1;
    return countParkingNights(
      bookingDateToMmDdYyyy(checkIn),
      bookingDateToMmDdYyyy(checkOut),
    );
  }, [
    usesBookingStayDates,
    bookingStayRange.from,
    bookingStayRange.to,
    parkingCheckIn,
    parkingCheckOut,
  ]);

  const totalPreview = rate * parkingNights;

  function effectiveParkingDates(): { checkIn: Date; checkOut: Date } | null {
    if (usesBookingStayDates) {
      return {
        checkIn: bookingStayRange.from,
        checkOut: bookingStayRange.to,
      };
    }
    if (!parkingCheckIn || !parkingCheckOut) return null;
    return { checkIn: parkingCheckIn, checkOut: parkingCheckOut };
  }

  async function persistSettings(): Promise<boolean> {
    const dates = effectiveParkingDates();
    if (!dates) {
      toast.error('Select parking check-in and check-out dates');
      return false;
    }
    if (dates.checkOut <= dates.checkIn) {
      toast.error('Parking check-out must be after check-in');
      return false;
    }

    try {
      await saveRateMut.mutateAsync({
        bookingId: booking.id,
        parkingRateGuest: rate,
        parkingCheckInDate: bookingDateToMmDdYyyy(dates.checkIn),
        parkingCheckOutDate: bookingDateToMmDdYyyy(dates.checkOut),
      });
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save parking settings',
      );
      return false;
    }
  }

  async function handleEnterDetails() {
    const ok = await persistSettings();
    if (!ok) return;
    onOpenChange(false);
    navigate(buildPayParkingPath(booking.id, { admin: true }));
  }

  async function handleCopyUrl() {
    const ok = await persistSettings();
    if (!ok) return;
    const url = buildPayParkingAbsoluteUrl(booking.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Parking form link copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-md sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Car className="w-7 h-8 size-4 shrink-0 text-primary" aria-hidden />
            {viewMode ? 'View pay parking' : 'Add pay parking'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-4">
          {allowCustomParkingDates ? (
            <label className="flex gap-3 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBookingDuration}
                disabled={isSaving}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSameAsBookingDuration(checked);
                  if (checked) {
                    setParkingCheckIn(bookingStayRange.from);
                    setParkingCheckOut(bookingStayRange.to);
                  }
                }}
                className="mt-0.5 rounded size-4 shrink-0 border-input accent-primary"
              />
              <span className="flex flex-col text-sm leading-snug text-foreground">
                Same with booking duration
                {sameAsBookingDuration && (
                  <span className="text-base font-semibold">
                    {formatBookingDate(booking.check_in_date)} –{' '}
                    {formatBookingDate(booking.check_out_date)}
                  </span>
                )}
              </span>
            </label>
          ) : null}

          {allowCustomParkingDates && !sameAsBookingDuration ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pay-parking-check-in" className="text-sm">
                  Parking check-in
                </Label>
                <DatePicker
                  date={parkingCheckIn}
                  rangeEnd={parkingCheckOut}
                  minDate={stayBounds.minDate}
                  maxDate={stayBounds.maxDate}
                  disabled={() => isSaving}
                  placeholder="Select parking check-in"
                  onSelect={(date) => {
                    if (!date) return;
                    setParkingCheckIn(date);
                    setParkingCheckOut((prev) =>
                      defaultParkingCheckOutAfterCheckIn(
                        date,
                        prev,
                        stayBounds.maxDate,
                      ),
                    );
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-parking-check-out" className="text-sm">
                  Parking check-out
                </Label>
                <DatePicker
                  date={parkingCheckOut}
                  rangeEnd={parkingCheckIn}
                  minDate={parkingCheckIn ?? stayBounds.minDate}
                  maxDate={stayBounds.maxDate}
                  disabled={(date) => {
                    if (isSaving) return true;
                    if (parkingCheckIn && date <= parkingCheckIn) return true;
                    return false;
                  }}
                  placeholder="Select parking check-out"
                  onSelect={(date) => {
                    if (date) setParkingCheckOut(date);
                  }}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="pay-parking-rate" className="text-sm font-medium">
              Parking Rate (per night)
            </Label>
            <input
              id="pay-parking-rate"
              type="number"
              min={1}
              step={10}
              value={rate}
              disabled={isSaving}
              onChange={(e) => setRate(Number(e.target.value))}
              className="px-3 w-full h-11 text-sm rounded-lg border border-input bg-background disabled:opacity-60"
            />
            <p className="text-sm text-muted-foreground">
              {formatMoney(rate)} × {parkingNights} night
              {parkingNights !== 1 ? 's' : ''} ={' '}
              <span className="font-semibold text-foreground">
                {formatMoney(totalPreview)}
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="min-h-[44px] w-full gap-2"
            disabled={isSaving}
            onClick={() => void handleEnterDetails()}
          >
            {isSaving ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <ExternalLink className="size-4 shrink-0" aria-hidden />
            )}
            Enter parking details
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            disabled={isSaving}
            onClick={() => void handleCopyUrl()}
          >
            {isSaving ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0" aria-hidden />
            )}
            Copy parking URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayParkingHeaderButton({
  booking,
  onOpenModal,
  onViewParking,
}: {
  booking: BookingRow;
  onOpenModal: () => void;
  onViewParking: () => void;
}) {
  const viewMode = hasPayParkingAvailed(booking);

  return (
    <button
      type="button"
      onClick={viewMode ? onViewParking : onOpenModal}
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:inline-flex sm:w-auto sm:min-w-[44px] sm:flex-initial sm:justify-center sm:gap-1.5"
    >
      <Car className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 text-left">
        {viewMode ? 'View pay parking' : 'Add pay parking'}
      </span>
    </button>
  );
}
