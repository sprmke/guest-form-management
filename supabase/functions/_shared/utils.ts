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
 * Handles multiple input formats including MM-DD-YYYY, YYYY-MM-DD, and ISO strings
 * @param dateStr - The date string to format
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  
  // Try to parse with common date formats using strict parsing
  const formats = [
    'YYYY-MM-DD',     // ISO format
    'MM-DD-YYYY',     // US format with leading zeros
    'M-DD-YYYY',      // US format without leading zero in month
    'MM-D-YYYY',      // US format without leading zero in day
    'M-D-YYYY',       // US format without leading zeros
    'YYYY/MM/DD',     // ISO with slashes
    'MM/DD/YYYY',     // US format with slashes
  ];
  
  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true); // strict parsing
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }
  
  // Fallback to default dayjs parsing (handles ISO strings, timestamps, etc.)
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

/**
 * Normalizes a value for comparison
 * - Converts empty strings to undefined
 * - Trims strings
 * - Converts boolean-like strings to booleans
 */
const normalizeValue = (value: any): any => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return trimmed;
  }
  if (typeof value === 'number' && value === 0) return undefined;
  return value;
};

/**
 * Compares new form data with existing database data to detect changes
 * @param newFormData - The new form data from the submission
 * @param existingData - The existing data from the database
 * @returns Object with hasChanges boolean and list of changed fields
 */
export const compareFormData = (newFormData: FormData, existingData: any): { hasChanges: boolean; changedFields: string[] } => {
  const changedFields: string[] = [];
  
  // Define fields to compare (excluding files as they're handled separately)
  const fieldsToCompare = [
    { form: 'guestFacebookName', db: 'guest_facebook_name' },
    { form: 'primaryGuestName', db: 'primary_guest_name' },
    { form: 'guestEmail', db: 'guest_email' },
    { form: 'guestPhoneNumber', db: 'guest_phone_number' },
    { form: 'guestAddress', db: 'guest_address' },
    { form: 'checkInDate', db: 'check_in_date', isDate: true },
    { form: 'checkOutDate', db: 'check_out_date', isDate: true },
    { form: 'checkInTime', db: 'check_in_time', isTime: true },
    { form: 'checkOutTime', db: 'check_out_time', isTime: true },
    { form: 'nationality', db: 'nationality' },
    { form: 'numberOfAdults', db: 'number_of_adults', isNumber: true },
    { form: 'numberOfChildren', db: 'number_of_children', isNumber: true },
    { form: 'guest2Name', db: 'guest2_name' },
    { form: 'guest3Name', db: 'guest3_name' },
    { form: 'guest4Name', db: 'guest4_name' },
    { form: 'guest5Name', db: 'guest5_name' },
    { form: 'guestSpecialRequests', db: 'guest_special_requests' },
    { form: 'findUs', db: 'find_us' },
    { form: 'findUsDetails', db: 'find_us_details' },
    { form: 'needParking', db: 'need_parking', isBoolean: true },
    { form: 'carPlateNumber', db: 'car_plate_number' },
    { form: 'carBrandModel', db: 'car_brand_model' },
    { form: 'carColor', db: 'car_color' },
    { form: 'hasPets', db: 'has_pets', isBoolean: true },
    { form: 'petName', db: 'pet_name' },
    { form: 'petBreed', db: 'pet_breed' },
    { form: 'petAge', db: 'pet_age' },
    { form: 'petVaccinationDate', db: 'pet_vaccination_date', isDate: true },
  ];

  // Check each field for changes
  for (const field of fieldsToCompare) {
    let newValue: any = newFormData.get(field.form);
    let existingValue: any = existingData[field.db];

    // Handle date formatting for comparison
    if (field.isDate && newValue) {
      // Format both dates to YYYY-MM-DD for comparison
      newValue = formatDate(newValue);
      existingValue = formatDate(existingValue);
    }

    // Handle time formatting for comparison
    if (field.isTime && newValue) {
      newValue = formatTime(newValue) || (field.db === 'check_in_time' ? DEFAULT_CHECK_IN_TIME : DEFAULT_CHECK_OUT_TIME);
      existingValue = formatTime(existingValue) || (field.db === 'check_in_time' ? DEFAULT_CHECK_IN_TIME : DEFAULT_CHECK_OUT_TIME);
    }

    // Handle number conversion
    if (field.isNumber && newValue) {
      newValue = Number(newValue);
    }

    // Handle boolean conversion
    if (field.isBoolean) {
      newValue = newValue === 'true' || newValue === true;
      existingValue = existingValue === true;
    }

    // Normalize both values for comparison
    const normalizedNew = normalizeValue(newValue);
    const normalizedExisting = normalizeValue(existingValue);

    // Compare values
    if (normalizedNew !== normalizedExisting) {
      changedFields.push(field.form);
      console.log(`  📝 Field changed - ${field.form}:`, {
        new: normalizedNew,
        existing: normalizedExisting
      });
    }
  }

  // Check if files have changed (if new files are uploaded)
  // We need to compare file names to see if they're different from existing ones
  const fileFieldMappings = [
    { form: 'paymentReceipt', formName: 'paymentReceiptFileName', db: 'payment_receipt_url' },
    { form: 'validId', formName: 'validIdFileName', db: 'valid_id_url' },
    { form: 'petVaccination', formName: 'petVaccinationFileName', db: 'pet_vaccination_url' },
    { form: 'petImage', formName: 'petImageFileName', db: 'pet_image_url' },
  ];
  
  for (const fileField of fileFieldMappings) {
    const file = newFormData.get(fileField.form);
    const fileName = newFormData.get(fileField.formName) as string;
    const existingUrl = existingData[fileField.db];
    
    console.log(`  🔍 Checking ${fileField.form}:`, {
      hasFile: !!file,
      fileSize: file instanceof File ? file.size : 0,
      fileName,
      existingUrl
    });
    
    // Only mark as changed if:
    // 1. A file exists in the form data AND
    // 2. Either there's no existing URL OR the filename is different
    if (file && file instanceof File && file.size > 0 && fileName) {
      // Extract the filename from the existing URL (if it exists)
      let existingFileName = '';
      if (existingUrl && typeof existingUrl === 'string') {
        // URL format is typically: bucket/path/filename or full URL
        // Handle both storage path and full URL
        const urlStr = existingUrl.includes('http') ? existingUrl : existingUrl;
        const urlParts = urlStr.split('/');
        existingFileName = urlParts[urlParts.length - 1];
        
        // Decode URL-encoded characters
        existingFileName = decodeURIComponent(existingFileName);
      }
      
      console.log(`    Comparing: new="${fileName}" vs existing="${existingFileName}"`);
      
      // Compare filenames - if they're different or no existing file, mark as changed
      if (!existingUrl || !existingFileName || fileName !== existingFileName) {
        changedFields.push(fileField.form);
        console.log(`    📎 File changed - ${fileField.form}: "${existingFileName}" → "${fileName}"`);
      } else {
        console.log(`    ⏭️ File unchanged - ${fileField.form}: "${fileName}"`);
      }
    } else if (!file || !(file instanceof File) || file.size === 0) {
      console.log(`    ⏭️ No file data - ${fileField.form}`);
    }
  }

  const hasChanges = changedFields.length > 0;
  console.log(`\n${hasChanges ? '✅' : '❌'} Data comparison complete: ${hasChanges ? changedFields.length + ' changes detected' : 'No changes detected'}`);
  
  return { hasChanges, changedFields };
};
