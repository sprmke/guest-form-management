import dayjs from 'https://esm.sh/dayjs@1.11.10'
import customParseFormat from 'https://esm.sh/dayjs@1.11.10/plugin/customParseFormat'

dayjs.extend(customParseFormat)

  /**
   * Formats a date and time string to ISO 8601 format
   */
  export const formatDateTime = (date: string, time: string): string => {
    const [month, day, year] = date.split('-');
    const formattedDate = `${year}-${month}-${day}`;
    
    let [hours, minutes] = time.split(':');
    const period = minutes.split(' ')[1];
    minutes = minutes.split(' ')[0];
    
    if (period === 'PM' && hours !== '12') {
      hours = String(Number(hours) + 12);
    } else if (period === 'AM' && hours === '12') {
      hours = '00';
    }
    
    return `${formattedDate}T${hours}:${minutes}:00`;
  }

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

/**
 * Extracts a route parameter from a URL path
 * @param pathname - The URL pathname
 * @param routePattern - The route pattern to match (e.g., '/submit-form/')
 * @returns The extracted parameter or null if not found
 */
export const extractRouteParam = (pathname: string, routePattern: string): string | null => {
  // Escape special regex characters in the route pattern
  const escapedPattern = routePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Create a regex pattern that matches the route followed by a parameter
  const regex = new RegExp(`${escapedPattern}([^\\/\\?]+)`);
  const match = pathname.match(regex);
  return match && match[1] ? match[1] : null;
};

// Format URLs to ensure they are publicly accessible
export const formatPublicUrl = (url: string) => {
  if (!url) return '';

  // If URL contains kong:8000, replace it with the correct public URL
  return url.replace('http://kong:8000', 'http://127.0.0.1:54321');
};

/**
 * Checks if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export const isDevelopment = (): boolean => {
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('DENO_ENV') || 'development';
  return env !== 'production';
};
