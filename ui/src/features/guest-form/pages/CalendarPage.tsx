import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/layouts/MainLayout';
import {
  dateToString,
  stringToDate,
  createDisabledDateMatcher,
  normalizeDateString,
  type BookedDateRange,
} from '@/utils/dates';
import { CalendarCheck, ArrowRight, CalendarX, Info } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const apiUrl = import.meta.env.VITE_API_URL;

export function CalendarPage() {
  const navigate = useNavigate();
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);

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

  // Proceed to guest form
  const handleProceed = () => {
    if (checkInDate && checkOutDate) {
      const checkIn = dateToString(checkInDate);
      const checkOut = dateToString(checkOutDate);
      navigate(`/?checkInDate=${checkIn}&checkOutDate=${checkOut}`);
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
    return bookedDates.some(booking => {
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

  return (
    <MainLayout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <CalendarCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Check Availability
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select your check-in and check-out dates to book your stay
          </p>
        </div>

        {/* Calendar Container */}
        <div className="flex justify-center">
          <div className="availability-calendar">
            {isLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="w-8 h-8 border-4 rounded-full animate-spin border-primary border-t-transparent" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                numberOfMonths={1}
                modifiers={rangeModifiers}
                modifiersClassNames={{
                  range_start: 'rdp-day_range_start',
                  range_end: 'rdp-day_range_end',
                  range_middle: 'rdp-day_range_middle',
                }}
                fromDate={new Date()}
                className="calendar-availability"
              />
            )}
          </div>
        </div>

        {/* Selection Summary */}
        <div className="mt-8">
          {checkInDate || checkOutDate ? (
            <div className="p-4 border rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 border-primary/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                  {/* Check-in */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <CalendarCheck className="w-5 h-5 text-primary" />
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <CalendarX className="w-5 h-5 text-primary" />
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
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 border rounded-xl bg-muted/30 border-border/50">
              <Info className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click on a date to select your check-in, then click another date
                for check-out
              </p>
            </div>
          )}
        </div>

        {/* Proceed Button */}
        <div className="mt-6">
          <Button
            onClick={handleProceed}
            disabled={!checkInDate || !checkOutDate}
            className="w-full h-12 text-base font-semibold transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkInDate && checkOutDate ? (
              <>
                Proceed to Booking Form
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Select dates to continue'
            )}
          </Button>
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Booking Information</p>
              <ul className="mt-1 space-y-1 list-disc list-inside text-blue-700">
                <li>Standard check-in time is 2:00 PM</li>
                <li>Standard check-out time is 11:00 AM</li>
                <li>Early check-in and late check-out may be available upon request</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

