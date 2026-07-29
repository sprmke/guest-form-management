import { useState, useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { format, differenceInDays } from 'date-fns';
import { CalendarCheck, ArrowRight, CalendarX, Info } from 'lucide-react';

import { useGuestAuth } from '@/features/guest/auth/context/GuestAuthContext';
import { useGuestPaymentInfo } from '@/features/guest/form/hooks/useGuestPaymentInfo';
import {
  hasStrippedGuestQueryKeys,
  stripLegacyFromQueryParam,
} from '@/features/guest/form/lib/bookingSourceFromSearchParams';
import { guestBookedDatesUrl } from '@/features/guest/form/lib/guestPropertyScope';
import {
  useGuestPropertySearchParams,
  useGuestPropertySlug,
} from '@/features/guest/hooks/useGuestPropertySlug';
import { guestCalendarPath, guestFormPath } from '@/features/guest/lib/guestPublicPaths';

import { KameFormBrandHeader } from '@/components/branding/KameFormBrandHeader';
import { CalendarPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { GuestNavState } from '@/layouts/guest/navState';
import { cn } from '@/lib/utils';
import {
  dateToString,
  stringToDate,
  createDisabledDateMatcher,
  normalizeDateString,
  type BookedDateRange,
} from '@/utils/format/dates';

const apiUrl = import.meta.env.VITE_API_URL;

export function CalendarPage() {
  const navigate = useNavigate();
  const { requireGuestAuth } = useGuestAuth();
  const [searchParams] = useSearchParams();
  const propertySlug = useGuestPropertySlug();
  const scopedSearchParams = useGuestPropertySearchParams();
  const { data: guestBrand } = useGuestPaymentInfo();
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Drop deprecated `dev` / `testing` / control flags from the address bar.
  useEffect(() => {
    if (!propertySlug || !hasStrippedGuestQueryKeys(searchParams)) return;
    const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
    navigate(guestCalendarPath(propertySlug, next), { replace: true });
  }, [navigate, propertySlug, searchParams]);

  // Legacy `/?bookingId=` and `/form?bookingId=` → property form route.
  useEffect(() => {
    const bookingId = searchParams.get('bookingId')?.trim();
    if (!bookingId || !propertySlug) return;
    const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
    navigate(guestFormPath(propertySlug, next), { replace: true });
  }, [navigate, propertySlug, searchParams]);

  // Fetch booked dates on mount
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const response = await fetch(guestBookedDatesUrl(apiUrl, propertySlug, searchParams), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        const result = await response.json();

        if (response.ok && result.success && result.data) {
          const normalizedDates = result.data.map((booking: BookedDateRange) => ({
            ...booking,
            checkInDate: normalizeDateString(booking.checkInDate),
            checkOutDate: normalizeDateString(booking.checkOutDate),
          }));
          setBookedDates(normalizedDates);
        }
      } catch (error) {
        console.error('Error fetching booked dates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedDates();
  }, [propertySlug, searchParams]);

  // Calculate number of nights
  const numberOfNights =
    checkInDate && checkOutDate ? differenceInDays(checkOutDate, checkInDate) : 0;

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // If no check-in date, set it
    if (!checkInDate) {
      setCheckInDate(date);
      return;
    }

    // If we have check-in but no check-out
    if (checkInDate && !checkOutDate) {
      // If selected date is after check-in, set as check-out
      if (date > checkInDate) {
        setCheckOutDate(date);
      } else {
        // If selected date is before or same as check-in, reset and set as new check-in
        setCheckInDate(date);
        setCheckOutDate(undefined);
      }
      return;
    }

    // If both dates are set, reset and start new selection
    setCheckInDate(date);
    setCheckOutDate(undefined);
  };

  // Clear selection
  const handleClearSelection = () => {
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
  };

  // Proceed to guest form — auth modal gates booking; keep query params (e.g. source=airbnb)
  const handleProceed = () => {
    if (!checkInDate || !checkOutDate || !propertySlug) return;

    const checkIn = dateToString(checkInDate);
    const checkOut = dateToString(checkOutDate);
    const next = stripLegacyFromQueryParam(new URLSearchParams(scopedSearchParams));
    next.set('checkInDate', checkIn);
    next.set('checkOutDate', checkOut);
    next.delete('bookingId');

    const target = guestFormPath(propertySlug, next);
    const navState = { guestEnter: 'forward' } satisfies GuestNavState;

    requireGuestAuth(() => navigate(target, { state: navState }), {
      resume: { type: 'navigate', to: target, navState },
    });
  };

  // Find the first booked check-in date after the selected check-in
  const getFirstBlockingDate = (fromDate: Date): Date | null => {
    let firstBlocking: Date | null = null;

    for (const booking of bookedDates) {
      const bookingCheckIn = stringToDate(booking.checkInDate);
      if (bookingCheckIn > fromDate) {
        if (!firstBlocking || bookingCheckIn < firstBlocking) {
          firstBlocking = bookingCheckIn;
        }
      }
    }

    return firstBlocking;
  };

  // Check if a date is within a booked range (for checkout: allows check-in dates)
  const isDateBookedForCheckout = (date: Date) => {
    return bookedDates.some((booking) => {
      try {
        const bookingCheckIn = stringToDate(booking.checkInDate);
        const bookingCheckOut = stringToDate(booking.checkOutDate);
        const dateToCheck = new Date(date);
        dateToCheck.setHours(0, 0, 0, 0);

        // For checkout: only disable dates AFTER check-in and BEFORE check-out
        // This allows selecting check-in dates as checkout (same-day turnover)
        return dateToCheck > bookingCheckIn && dateToCheck < bookingCheckOut;
      } catch {
        return false;
      }
    });
  };

  // Disabled date matcher for the calendar
  // Uses different logic based on whether we're selecting check-in or check-out
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable past dates
    if (date < today) {
      return true;
    }

    // If check-in is already selected (selecting checkout)
    if (checkInDate && !checkOutDate) {
      // Disable dates on or before the check-in date
      if (date <= checkInDate) {
        return true;
      }

      // For potential checkout dates: use lenient check that allows check-in dates
      if (isDateBookedForCheckout(date)) {
        return true;
      }

      // Also disable dates that would span across a booked period
      const firstBlocking = getFirstBlockingDate(checkInDate);
      if (firstBlocking) {
        // Disable dates after a booking's check-in (but allow the check-in date itself)
        if (date > firstBlocking) {
          return true;
        }
      }

      return false;
    }

    // Default (selecting check-in): use strict matcher that disables all booked dates
    return createDisabledDateMatcher(bookedDates, null)(date);
  };

  // Custom modifiers for range highlighting
  const rangeModifiers = {
    range_start: checkInDate ? [checkInDate] : [],
    range_end: checkOutDate ? [checkOutDate] : [],
    range_middle: (day: Date) => {
      if (!checkInDate || !checkOutDate) return false;
      return day > checkInDate && day < checkOutDate;
    },
  };

  const canProceed = Boolean(checkInDate && checkOutDate);

  if (isLoading) {
    return <CalendarPageSkeleton />;
  }

  return (
    <div className="guest-inner-enter relative min-w-0 space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      <KameFormBrandHeader title="Check Availability" logoSrc={guestBrand?.emailLogoUrl} />

      {/* Calendar Container */}
      <div className="flex w-full justify-center">
        <div className="availability-calendar">
          <Calendar
            mode="single"
            selected={checkInDate}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            numberOfMonths={1}
            modifiers={rangeModifiers}
            modifiersClassNames={{
              range_start: 'rdp-range_start',
              range_end: 'rdp-range_end',
              range_middle: 'rdp-range_middle',
            }}
            fromDate={new Date()}
            className={cn('calendar-availability', checkOutDate && 'calendar-range-active')}
          />
        </div>
      </div>

      {/* Selection Summary */}
      <div>
        {checkInDate || checkOutDate ? (
          <div className="surface-muted border-primary/15 rounded-xl border p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                {/* Check-in */}
                <div className="flex items-center gap-3">
                  <div className="icon-well-sm bg-primary/10">
                    <CalendarCheck className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Check-in</p>
                    <p className="text-foreground font-semibold">
                      {checkInDate ? format(checkInDate, 'MMM dd, yyyy') : 'Select date'}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="text-muted-foreground hidden h-5 w-5 sm:block" />

                {/* Check-out */}
                <div className="flex items-center gap-3">
                  <div className="icon-well-sm bg-primary/10">
                    <CalendarX className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Check-out</p>
                    <p className="text-foreground font-semibold">
                      {checkOutDate ? format(checkOutDate, 'MMM dd, yyyy') : 'Select date'}
                    </p>
                  </div>
                </div>

                {/* Nights */}
                {numberOfNights > 0 && (
                  <div className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm font-medium">
                    {numberOfNights} night{numberOfNights > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Clear Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Proceed Button */}
      <div>
        <Button
          onClick={handleProceed}
          disabled={!canProceed}
          variant={canProceed ? 'default' : 'secondary'}
          size="lg"
          className="w-full"
        >
          {canProceed ? (
            <>
              Proceed to Booking Form
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            'Select dates to continue'
          )}
        </Button>
      </div>

      {canProceed ? (
        <div className="border-primary/15 bg-primary/5 mt-6 rounded-xl border p-4">
          <div className="flex gap-3">
            <Info className="text-primary mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-foreground/80 text-sm">
              <p className="text-foreground font-semibold">Booking Information</p>
              <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-1">
                <li>Standard check-in time is 2:00 PM</li>
                <li>Standard check-out time is 11:00 AM</li>
                <li>Early check-in and late check-out may be available upon request</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
