import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import { UseFormReturn } from "react-hook-form";

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