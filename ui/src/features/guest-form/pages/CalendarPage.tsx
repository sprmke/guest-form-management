import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { stripLegacyFromQueryParam } from '@/features/guest-form/lib/bookingSourceFromSearchParams';
import type { GuestNavState } from '@/layouts/guestNavState';
import {
  dateToString,
  stringToDate,
  createDisabledDateMatcher,
  normalizeDateString,
  type BookedDateRange,
} from '@/utils/dates';
import { KameFormBrandHeader } from '@/components/KameFormBrandHeader';
import { CalendarPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { CalendarCheck, ArrowRight, CalendarX, Info } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const apiUrl = import.meta.env.VITE_API_URL;

export function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Legacy and shared links may use `/?bookingId=`; guest form lives at `/form`.
  useEffect(() => {
    const bookingId = searchParams.get('bookingId')?.trim();
    if (!bookingId) return;
    const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
    navigate(`/form?${next.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  // Fetch booked dates on mount
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const response = await fetch(`${apiUrl}/get-booked-dates`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        const result = await response.json();

        if (response.ok && result.success && result.data) {
          const normalizedDates = result.data.map(
            (booking: BookedDateRange) => ({
              ...booking,
              checkInDate: normalizeDateString(booking.checkInDate),
              checkOutDate: normalizeDateString(booking.checkOutDate),
            }),
          );
          setBookedDates(normalizedDates);
        }
      } catch (error) {
        console.error('Error fetching booked dates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedDates();
  }, []);

  // Calculate number of nights
  const numberOfNights =
    checkInDate && checkOutDate
      ? differenceInDays(checkOutDate, checkInDate)
      : 0;

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

  // Proceed to guest form — keep query params (e.g. source=airbnb, dev=true); drop legacy `from`
  const handleProceed = () => {
    if (checkInDate && checkOutDate) {
      const checkIn = dateToString(checkInDate);
      const checkOut = dateToString(checkOutDate);
      const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
      next.set('checkInDate', checkIn);
      next.set('checkOutDate', checkOut);
      // Fresh date selection from calendar is a new booking flow
      next.delete('bookingId');
      navigate(`/form?${next.toString()}`, {
        state: { guestEnter: 'forward' } satisfies GuestNavState,
      });
    }
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
    <div className="relative min-w-0 space-y-6 p-4 guest-inner-enter sm:space-y-8 sm:p-6 lg:p-8">
        <KameFormBrandHeader title="Check Availability" />

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
              className={cn(
                'calendar-availability',
                checkOutDate && 'calendar-range-active',
              )}
            />
          </div>
        </div>

        {/* Selection Summary */}
        <div>
          {checkInDate || checkOutDate ? (
            <div className="surface-muted rounded-2xl border border-primary/15 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                  {/* Check-in */}
                  <div className="flex items-center gap-3">
                    <div className="icon-well-sm bg-primary/10">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Check-in
                      </p>
                      <p className="font-semibold text-foreground">
                        {checkInDate
                          ? format(checkInDate, 'MMM dd, yyyy')
                          : 'Select date'}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="hidden w-5 h-5 text-muted-foreground sm:block" />

                  {/* Check-out */}
                  <div className="flex items-center gap-3">
                    <div className="icon-well-sm bg-primary/10">
                      <CalendarX className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Check-out
                      </p>
                      <p className="font-semibold text-foreground">
                        {checkOutDate
                          ? format(checkOutDate, 'MMM dd, yyyy')
                          : 'Select date'}
                      </p>
                    </div>
                  </div>

                  {/* Nights */}
                  {numberOfNights > 0 && (
                    <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
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
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Select dates to continue'
            )}
          </Button>
        </div>

        {canProceed ? (
          <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm text-foreground/80">
                <p className="font-semibold text-foreground">
                  Booking Information
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Standard check-in time is 2:00 PM</li>
                  <li>Standard check-out time is 11:00 AM</li>
                  <li>
                    Early check-in and late check-out may be available upon
                    request
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
