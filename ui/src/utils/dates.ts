import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import { UseFormReturn } from "react-hook-form";
import { parse, isWithinInterval, startOfDay } from 'date-fns';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set timezone to Asia/Manila
dayjs.tz.setDefault('Asia/Manila');

// Format date to YYYY-MM-DD
export const formatDateToYYYYMMDD = (date: Date) => dayjs(date).format('YYYY-MM-DD');

export const formatDateToMMDDYYYY = (dateString: string): string => {
  try {
    if (!dateString) return '';
    const date = dayjs(dateString);
    if (!date.isValid()) return '';
    
    return date.format('MM-DD-YYYY');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatDateToLongFormat = (dateString: string): string => {
  try {
    if (!dateString) return '';
    const date = dayjs(dateString);
    if (!date.isValid()) return '';
    
    return date.format('MMM D, YYYY');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatTimeToAMPM = (time: string, isCheckIn: boolean = false): string => {
  try {
    // Handle empty or invalid input
    if (!time) {
      return isCheckIn ? "02:00 PM" : "11:00 AM"
    }
    
    return dayjs(`2000-01-01 ${time}`).format('hh:mm A');
  } catch (error) {
    console.error('Error formatting time:', error)
    return isCheckIn ? "02:00 PM" : "11:00 AM"
  }
} 

// Get today and tomorrow dates
export const getDefaultDates = () => {
  const today = dayjs();
  const tomorrow = today.add(1, 'day');
  
  return {
    today: today.toDate(),
    tomorrow: tomorrow.toDate()
  };
};

// Helper to get today's date in YYYY-MM-DD format accounting for timezone
export const getTodayDate = () => {
  return dayjs().format('YYYY-MM-DD');
};

// Helper to get next day's date in YYYY-MM-DD format
export const getNextDay = (date: string) => {
  return dayjs(date).add(1, 'day').format('YYYY-MM-DD');
};

// Handle check-in date changes
export const handleCheckInDateChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  form: UseFormReturn<GuestFormData>
) => {
  const checkInDate = e.target.value;
  form.setValue('checkInDate', checkInDate);
  form.setValue('checkOutDate', getNextDay(checkInDate));
};

// Type for booked date range
export interface BookedDateRange {
  id: string;
  checkInDate: string;
  checkOutDate: string;
}

// Check if two date ranges overlap
export const datesOverlap = (
  checkIn1: string,
  checkOut1: string,
  checkIn2: string,
  checkOut2: string
): boolean => {
  // Convert to Date objects for comparison
  const start1 = dayjs(checkIn1);
  const end1 = dayjs(checkOut1);
  const start2 = dayjs(checkIn2);
  const end2 = dayjs(checkOut2);

  // Two date ranges overlap if:
  // (StartA < EndB) AND (EndA > StartB)
  return start1.isBefore(end2) && end1.isAfter(start2);
};

// Check if selected dates overlap with any booked dates
export const checkDateOverlap = (
  checkInDate: string,
  checkOutDate: string,
  bookedDates: BookedDateRange[],
  currentBookingId?: string | null
): { hasOverlap: boolean; overlappingBooking?: BookedDateRange } => {
  if (!checkInDate || !checkOutDate || !bookedDates.length) {
    return { hasOverlap: false };
  }

  const overlappingBooking = bookedDates.find(booking => {
    // Skip checking against the current booking if we're editing
    if (currentBookingId && booking.id === currentBookingId) {
      return false;
    }
    return datesOverlap(checkInDate, checkOutDate, booking.checkInDate, booking.checkOutDate);
  });

  return {
    hasOverlap: !!overlappingBooking,
    overlappingBooking
  };
};

// Get all dates between two dates (inclusive)
export const getDatesBetween = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  let currentDate = dayjs(startDate);
  const end = dayjs(endDate);

  while (currentDate.isBefore(end) || currentDate.isSame(end)) {
    dates.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'day');
  }

  return dates;
};

// Get all disabled dates from booked date ranges
export const getDisabledDates = (bookedDates: BookedDateRange[]): string[] => {
  const disabledDates: string[] = [];
  
  bookedDates.forEach(booking => {
    const dates = getDatesBetween(booking.checkInDate, booking.checkOutDate);
    disabledDates.push(...dates);
  });

  return [...new Set(disabledDates)]; // Remove duplicates
};

// Convert YYYY-MM-DD string to Date object
export const stringToDate = (dateString: string): Date => {
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

// Convert Date object to YYYY-MM-DD string
export const dateToString = (date: Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

// Create a disabled date matcher for react-day-picker
export const createDisabledDateMatcher = (
  bookedDates: BookedDateRange[],
  currentBookingId?: string | null
) => {
  return (date: Date) => {
    // Check if this date falls within any booked range
    return bookedDates.some(booking => {
      // Skip checking against the current booking if we're editing
      if (currentBookingId && booking.id === currentBookingId) {
        return false;
      }
      
      try {
        const checkIn = stringToDate(booking.checkInDate);
        const checkOut = stringToDate(booking.checkOutDate);
        
        // Check if date is within the booked range (inclusive)
        return isWithinInterval(startOfDay(date), {
          start: startOfDay(checkIn),
          end: startOfDay(checkOut),
        });
      } catch (e) {
        return false;
      }
    });
  };
};