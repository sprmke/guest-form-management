import { useEffect, useMemo } from 'react';

import type { GuestFormData } from '@/features/guest/form/schemas/guestFormSchema';
import {
  bookingStayNights,
  countParkingNights,
  defaultParkingCheckOutAfterCheckIn,
  parseBookingStayDate,
} from '@/features/guest/pay-parking/lib/payParkingHelpers';

import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  dateToString,
  stringToDate,
  toGuestSubmissionDate,
  DATE_PICKER_DISPLAY_FORMAT,
  formatIsoDateForDisplay,
} from '@/utils/format/dates';

import type { UseFormReturn } from 'react-hook-form';

function formatGuestFormDisplayDate(ymd: string): string {
  return formatIsoDateForDisplay(ymd) || ymd;
}

type Props = {
  form: UseFormReturn<GuestFormData>;
};

export function GuestFormParkingDates({ form }: Props) {
  const checkInDate = form.watch('checkInDate');
  const checkOutDate = form.watch('checkOutDate');
  const sameAsBookingDuration = form.watch('parkingSameAsBookingDuration') ?? true;
  const parkingCheckInDate = form.watch('parkingCheckInDate');
  const parkingCheckOutDate = form.watch('parkingCheckOutDate');

  const stayBounds = useMemo(() => {
    const minDate = parseBookingStayDate(checkInDate);
    const maxDate = parseBookingStayDate(checkOutDate);
    if (!minDate || !maxDate) {
      const today = new Date();
      return { minDate: today, maxDate: today };
    }
    return { minDate, maxDate };
  }, [checkInDate, checkOutDate]);

  const allowCustomParkingDates = useMemo(() => {
    if (!checkInDate || !checkOutDate) return false;
    return (
      bookingStayNights({
        check_in_date: toGuestSubmissionDate(checkInDate),
        check_out_date: toGuestSubmissionDate(checkOutDate),
      }) > 1
    );
  }, [checkInDate, checkOutDate]);

  const usesBookingStayDates = !allowCustomParkingDates || sameAsBookingDuration;

  useEffect(() => {
    if (!checkInDate || !checkOutDate) return;
    if (usesBookingStayDates) {
      form.setValue('parkingCheckInDate', checkInDate, { shouldDirty: true });
      form.setValue('parkingCheckOutDate', checkOutDate, { shouldDirty: true });
    }
  }, [checkInDate, checkOutDate, usesBookingStayDates, form]);

  const effectiveCheckIn = usesBookingStayDates ? checkInDate : parkingCheckInDate;
  const effectiveCheckOut = usesBookingStayDates ? checkOutDate : parkingCheckOutDate;

  const parkingNights = useMemo(() => {
    if (!effectiveCheckIn || !effectiveCheckOut) return 1;
    return countParkingNights(
      toGuestSubmissionDate(effectiveCheckIn),
      toGuestSubmissionDate(effectiveCheckOut)
    );
  }, [effectiveCheckIn, effectiveCheckOut]);

  if (!allowCustomParkingDates) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4">
      <FormField
        control={form.control}
        name="parkingSameAsBookingDuration"
        render={({ field }) => (
          <FormItem className="flex items-start space-x-2">
            <FormControl>
              <Checkbox
                checked={field.value ?? true}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  field.onChange(next);
                  if (next && checkInDate && checkOutDate) {
                    form.setValue('parkingCheckInDate', checkInDate);
                    form.setValue('parkingCheckOutDate', checkOutDate);
                  }
                }}
                className="mt-0.5"
              />
            </FormControl>
            <div className="!mt-[-3px] space-y-1">
              <FormLabel className="text-base">
                Parking Duration {sameAsBookingDuration ? '(same as booking duration)' : ''}
              </FormLabel>
              {(field.value ?? true) && checkInDate && checkOutDate ? (
                <p className="text-foreground text-sm font-medium">
                  {formatGuestFormDisplayDate(checkInDate)} –{' '}
                  {formatGuestFormDisplayDate(checkOutDate)} ({parkingNights} night
                  {parkingNights !== 1 ? 's' : ''})
                </p>
              ) : null}
            </div>
          </FormItem>
        )}
      />

      {!sameAsBookingDuration ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
          <FormField
            control={form.control}
            name="parkingCheckInDate"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Parking check-in</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value ? stringToDate(field.value) : undefined}
                    rangeEnd={parkingCheckOutDate ? stringToDate(parkingCheckOutDate) : undefined}
                    minDate={stayBounds.minDate}
                    maxDate={stayBounds.maxDate}
                    placeholder={DATE_PICKER_DISPLAY_FORMAT}
                    onSelect={(date) => {
                      if (!date) return;
                      const dateStr = dateToString(date);
                      field.onChange(dateStr);
                      const nextOut = defaultParkingCheckOutAfterCheckIn(
                        date,
                        parkingCheckOutDate ? stringToDate(parkingCheckOutDate) : undefined,
                        stayBounds.maxDate
                      );
                      form.setValue('parkingCheckOutDate', dateToString(nextOut));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parkingCheckOutDate"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Parking check-out</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value ? stringToDate(field.value) : undefined}
                    rangeEnd={parkingCheckInDate ? stringToDate(parkingCheckInDate) : undefined}
                    minDate={
                      parkingCheckInDate ? stringToDate(parkingCheckInDate) : stayBounds.minDate
                    }
                    maxDate={stayBounds.maxDate}
                    disabled={(date) => {
                      if (parkingCheckInDate) {
                        const checkIn = stringToDate(parkingCheckInDate);
                        if (checkIn && date <= checkIn) return true;
                      }
                      return false;
                    }}
                    placeholder={DATE_PICKER_DISPLAY_FORMAT}
                    onSelect={(date) => {
                      if (date) field.onChange(dateToString(date));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      {!sameAsBookingDuration && (
        <p className="text-muted-foreground text-sm">
          Parking duration:{' '}
          <span className="text-foreground font-medium">
            {parkingNights} night{parkingNights !== 1 ? 's' : ''}
          </span>
        </p>
      )}
    </div>
  );
}
