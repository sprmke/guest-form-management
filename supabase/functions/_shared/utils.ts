import dayjs from 'https://esm.sh/dayjs@1.11.10'
import customParseFormat from 'https://esm.sh/dayjs@1.11.10/plugin/customParseFormat'

dayjs.extend(customParseFormat)

/**
 * Formats a date string to YYYY-MM-DD format
 * @param dateStr - The date string to format
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

/**
 * Formats a time string to 24-hour HH:mm format
 * @param timeStr - The time string to format
 * @returns Formatted time string or empty string if invalid
 */
export const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  
  // Try parsing with various formats
  const formats = [
    'HH:mm',    // 24-hour format
    'H:mm',     // 24-hour format without leading zero
    'hh:mm A',  // 12-hour format with AM/PM
    'h:mm A',   // 12-hour format without leading zero
    'hh:mm a',  // 12-hour format with am/pm
    'h:mm a',   // 12-hour format without leading zero
    'hA',       // Just hours with AM/PM
    'ha',       // Just hours with am/pm
  ];

  for (const format of formats) {
    const parsed = dayjs(timeStr, format, true); // strict parsing
    if (parsed.isValid()) {
      return parsed.format('HH:mm');
    }
  }

  return '';
};

/**
 * Default check-in time (14:00 / 2 PM)
 */
export const DEFAULT_CHECK_IN_TIME = '14:00';

/**
 * Default check-out time (11:00 / 11 AM)
 */
export const DEFAULT_CHECK_OUT_TIME = '11:00'; 

// Format URLs to ensure they are publicly accessible
export const formatPublicUrl = (url: string) => {
  // If URL contains kong:8000, replace it with the correct public URL
  return url.replace('http://kong:8000', 'http://127.0.0.1:54321');
};
