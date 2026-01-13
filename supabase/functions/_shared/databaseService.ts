import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { GuestFormData, transformFormToSubmission } from './types.ts'
import { UploadService } from './uploadService.ts'
import { formatDate, formatTime, DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME, formatPublicUrl } from './utils.ts'

export class DatabaseService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async getRawData(bookingId: string) {
    console.log('Fetching raw data for booking:', bookingId);
    
    try {
      const { data, error } = await this.supabase
        .from('guest_submissions')
        .select('*')
        .eq('id', bookingId)
        .single();

      // PGRST116 means no rows found - this is expected for new bookings
      if (error && error.code === 'PGRST116') {
        console.log('No existing booking found (this is normal for new bookings)');
        return null;
      }

      if (error) {
        // PGRST116 means "not found" - this is expected for new submissions
        if (error.code === 'PGRST116') {
          console.log('Booking not found in database (new submission)');
          return null;
        }
        
        console.error('Database error:', error);
        throw new Error('Failed to fetch guest submission');
      }

      if (!data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching raw data:', error);
      throw error;
    }
  }

  static async getFormData(bookingId: string) {
    console.log('Fetching form data for booking:', bookingId);
    
    try {
      const { data, error } = await this.supabase
        .from('guest_submissions')
        .select('*')
        .eq('id', bookingId)
        .single();

      // PGRST116 means no rows found - return null for non-existent bookings
      if (error && error.code === 'PGRST116') {
        console.log('No existing booking found');
        return null;
      }

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch guest submission');
      }

      if (!data) {
        return null;
      }

      // Format dates and times
      const checkInDate = formatDate(data.check_in_date);
      const checkOutDate = formatDate(data.check_out_date);

      const checkInTime = formatTime(data.check_in_time) || DEFAULT_CHECK_IN_TIME;
      const checkOutTime = formatTime(data.check_out_time) || DEFAULT_CHECK_OUT_TIME;

      // Transform the database record back to form data format
      const formData: GuestFormData = {
        guestFacebookName: data.guest_facebook_name || '',
        guestEmail: data.guest_email || '',
        guestPhoneNumber: data.guest_phone_number || '',
        guestAddress: data.guest_address || '',
        checkInDate,
        checkInTime,
        checkOutDate,
        checkOutTime,
        nationality: data.nationality || '',
        numberOfAdults: data.number_of_adults || 1,
        numberOfChildren: data.number_of_children || 0,
        primaryGuestName: data.primary_guest_name || '',
        guest2Name: data.guest2_name || '',
        guest3Name: data.guest3_name || '',
        guest4Name: data.guest4_name || '',
        guestSpecialRequests: data.guest_special_requests || '',
        findUs: data.find_us || 'Facebook',
        findUsDetails: data.find_us_details || '',
        needParking: data.need_parking || false,
        carPlateNumber: data.car_plate_number || '',
        carBrandModel: data.car_brand_model || '',
        carColor: data.car_color || '',
        hasPets: data.has_pets || false,
        petName: data.pet_name || '',
        petType: data.pet_type || '',
        petBreed: data.pet_breed || '',
        petAge: data.pet_age || '',
        petVaccinationDate: formatDate(data.pet_vaccination_date),
        petVaccinationUrl: formatPublicUrl(data.pet_vaccination_url) || '',
        petImageUrl: formatPublicUrl(data.pet_image_url) || '',
        paymentReceiptUrl: formatPublicUrl(data.payment_receipt_url) || '',
        validIdUrl: formatPublicUrl(data.valid_id_url) || '',
      };

      console.log('Form data fetched successfully:', formData);
      return formData;
    } catch (error) {
      console.error('Error fetching form data:', error);
      throw error;
    }
  }

  static async processFormData(formData: FormData, saveToDatabase = true, saveImagesToStorage = true, isTestingMode = false): Promise<{ data: GuestFormData; submissionData: any; validIdUrl: string; paymentReceiptUrl: string; petVaccinationUrl?: string; petImageUrl?: string }> {
    try {
      console.log('Processing form data...');

      // Get required form fields
      const fullName = formData.get('primaryGuestName') as string;
      const checkInDate = formData.get('checkInDate') as string;
      const checkOutDate = formData.get('checkOutDate') as string;
      const guestEmail = formData.get('guestEmail') as string;
      const bookingId = formData.get('bookingId') as string;

      if (!fullName) {
        throw new Error('Full Name is required');
      }

      if (!checkInDate || !checkOutDate) {
        throw new Error('Check-in and check-out dates are required');
      }

      if (!guestEmail) {
        throw new Error('Email is required');
      }

      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      // Format dates
      const formattedCheckIn = formatDate(checkInDate);
      const formattedCheckOut = formatDate(checkOutDate);

      if (!formattedCheckIn || !formattedCheckOut) {
        throw new Error('Invalid check-in or check-out date format');
      }

      // Check if booking already exists using the booking ID (only if saving to database or storage)
      let existingBooking = null;
      if (saveToDatabase || saveImagesToStorage) {
        const { data, error: fetchError } = await this.supabase
          .from('guest_submissions')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error fetching existing booking:', fetchError);
          throw new Error('Failed to check for existing booking');
        }
        
        existingBooking = data;
      } else {
        console.log('⚠️ Skipping existing booking check (both saveToDatabase and saveImagesToStorage are false)');
      }

      // Handle file uploads
      let petVaccinationUrl: string | undefined;
      let petImageUrl: string | undefined;
      let paymentReceiptUrl: string;
      let validIdUrl: string;

      // Get the pet vaccination file and pet image file
      const petVaccination = formData.get('petVaccination') as File;
      const petImage = formData.get('petImage') as File;
      const hasPets = formData.get('hasPets') === 'true';
      
      // Add TEST prefix to filenames if in testing mode (without brackets to avoid invalid storage keys)
      const testPrefix = isTestingMode ? 'TEST_' : '';
      
      if (hasPets) {
        // Handle pet vaccination upload
        if (petVaccination) {
          const petVaccinationFileName = formData.get('petVaccinationFileName') as string;
          const prefixedFileName = `${testPrefix}${petVaccinationFileName}`;
          if (saveImagesToStorage) {
            petVaccinationUrl = await UploadService.uploadPetVaccination(petVaccination, prefixedFileName);
          } else {
            console.log('⚠️ Skipping pet vaccination upload (saveImagesToStorage=false)');
            petVaccinationUrl = 'dev-mode-skipped';
          }
        } else if (existingBooking) {
          petVaccinationUrl = existingBooking.pet_vaccination_url;
        } else if (!saveImagesToStorage) {
          petVaccinationUrl = 'dev-mode-skipped';
        } else {
          throw new Error('Pet vaccination record is required when bringing pets');
        }

        // Handle pet image upload
        if (petImage) {
          const petImageFileName = formData.get('petImageFileName') as string;
          const prefixedFileName = `${testPrefix}${petImageFileName}`;
          if (saveImagesToStorage) {
            petImageUrl = await UploadService.uploadPetImage(petImage, prefixedFileName);
          } else {
            console.log('⚠️ Skipping pet image upload (saveImagesToStorage=false)');
            petImageUrl = 'dev-mode-skipped';
          }
        } else if (existingBooking) {
          petImageUrl = existingBooking.pet_image_url;
        } else if (!saveImagesToStorage) {
          petImageUrl = 'dev-mode-skipped';
        } else {
          throw new Error('Pet image is required when bringing pets');
        }
      }

      // Get the payment receipt file
      const paymentReceipt = formData.get('paymentReceipt') as File;
      if (paymentReceipt) {
        const paymentReceiptFileName = formData.get('paymentReceiptFileName') as string;
        const prefixedFileName = `${testPrefix}${paymentReceiptFileName}`;
        if (saveImagesToStorage) {
          paymentReceiptUrl = await UploadService.uploadPaymentReceipt(paymentReceipt, prefixedFileName);
        } else {
          console.log('⚠️ Skipping payment receipt upload (saveImagesToStorage=false)');
          paymentReceiptUrl = 'dev-mode-skipped';
        }
      } else if (existingBooking) {
        paymentReceiptUrl = existingBooking.payment_receipt_url;
      } else if (!saveImagesToStorage) {
        paymentReceiptUrl = 'dev-mode-skipped';
      } else {
        throw new Error('Payment receipt is required');
      }

      // Get the valid ID file
      const validId = formData.get('validId') as File;
      if (validId) {
        const validIdFileName = formData.get('validIdFileName') as string;
        const prefixedFileName = `${testPrefix}${validIdFileName}`;
        if (saveImagesToStorage) {
          validIdUrl = await UploadService.uploadValidId(validId, prefixedFileName);
        } else {
          console.log('⚠️ Skipping valid ID upload (saveImagesToStorage=false)');
          validIdUrl = 'dev-mode-skipped';
        }
      } else if (existingBooking) {
        validIdUrl = existingBooking.valid_id_url;
      } else if (!saveImagesToStorage) {
        validIdUrl = 'dev-mode-skipped';
      } else {
        throw new Error('Valid ID is required');
      }

      // Convert form data to an object
      const formDataObj: Partial<GuestFormData> = {};
      formData.forEach((value, key) => {
        if (key !== 'paymentReceipt' && key !== 'validId' && key !== 'petVaccination' && key !== 'petImage') {
          formDataObj[key] = value;
        }
      });

      // Create the final data object
      const data = {
        ...(formDataObj as GuestFormData)
      };

      console.log('Form data processed successfully');
      
      // Transform data for database
      if (!paymentReceiptUrl) {
        throw new Error('Failed to upload payment receipt');
      }
      
      if (!validIdUrl) {
        throw new Error('Failed to upload valid ID');
      }
      
      const dbData = transformFormToSubmission(
        data, 
        paymentReceiptUrl,
        validIdUrl,
        petVaccinationUrl,
        petImageUrl,
        isTestingMode
      );

      // Save or update in database using the booking ID
      let submissionData;
      if (saveToDatabase) {
        if (existingBooking) {
          submissionData = await this.updateGuestSubmission(bookingId, dbData);
        } else {
          submissionData = await this.saveGuestSubmission({ ...dbData, id: bookingId });
        }
      } else {
        console.log('⚠️ Skipping database save (saveToDatabase=false)');
        // Return mock data for development
        submissionData = { id: bookingId, ...dbData, created_at: new Date().toISOString() };
      }

      return {
        data,
        submissionData,
        petVaccinationUrl: formatPublicUrl(petVaccinationUrl),
        petImageUrl: formatPublicUrl(petImageUrl),
        validIdUrl: formatPublicUrl(validIdUrl),
        paymentReceiptUrl: formatPublicUrl(paymentReceiptUrl)
      };
    } catch (error) {
      console.error('Error processing form data:', error);
      throw new Error('Failed to process form data: ' + error.message);
    }
  }

  private static async saveGuestSubmission(formData: any) {
    console.log('Saving new submission to database...');
    
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save guest submission');
    }

    console.log('Database submission successful');
    return data;
  }

  private static async updateGuestSubmission(bookingId: string, formData: any) {
    console.log('Updating existing submission in database...');
    
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .update(formData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to update guest submission');
    }

    console.log('Database update successful');
    return data;
  }

  static async checkOverlappingBookings(checkInDate: string, checkOutDate: string, bookingId?: string) {
    console.log('Checking for overlapping bookings...');
    console.log('Check-in:', checkInDate, 'Check-out:', checkOutDate, 'Booking ID:', bookingId);

    try {
      // Normalize dates to YYYY-MM-DD format for comparison
      const normalizeDate = (dateStr: string): string => {
        console.log(`  Normalizing date: "${dateStr}"`);
        
        // Check if date is in YYYY-MM-DD format (already normalized)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.log(`  → Already in YYYY-MM-DD format: ${dateStr}`);
          return dateStr;
        }
        // Check if date is in MM-DD-YYYY format
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [month, day, year] = dateStr.split('-');
          const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log(`  → Converted from MM-DD-YYYY to: ${normalized}`);
          return normalized;
        }
        // Return as-is if format is unknown
        console.warn('  ⚠️ Unknown date format:', dateStr);
        return dateStr;
      };

      const newCheckIn = normalizeDate(checkInDate);
      const newCheckOut = normalizeDate(checkOutDate);

      console.log('Normalized dates - Check-in:', newCheckIn, 'Check-out:', newCheckOut);

      // Query for overlapping bookings
      // Two date ranges overlap if:
      // (StartA < EndB) AND (EndA > StartB)
      // 
      // However, we allow check-in on checkout dates (same day turnover), so we exclude:
      // - New check-in === existing check-out
      // - New check-out === existing check-in
      
      let query = this.supabase
        .from('guest_submissions')
        .select('*'); // Select all to include status column if it exists

      // Exclude the current booking if updating
      if (bookingId) {
        query = query.neq('id', bookingId);
      }

      const { data: allBookings, error } = await query;

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to check for overlapping bookings');
      }

      // Filter out canceled bookings first (status column may not exist yet)
      const activeBookings = allBookings?.filter(booking => booking.status !== 'canceled') || [];

      console.log(`Found ${allBookings?.length || 0} total bookings, ${activeBookings.length} active (non-canceled) bookings to check`);

      // Filter overlapping bookings in memory
      const overlappingBookings = activeBookings?.filter(booking => {
        const existingCheckIn = normalizeDate(booking.check_in_date);
        const existingCheckOut = normalizeDate(booking.check_out_date);

        console.log(`Comparing with existing booking ${booking.id}:`);
        console.log(`  Existing: ${existingCheckIn} to ${existingCheckOut}`);
        console.log(`  New: ${newCheckIn} to ${newCheckOut}`);

        // Check if dates overlap
        // New booking overlaps if:
        // - New check-in is before existing check-out AND
        // - New check-out is after existing check-in
        // However, we allow check-in on checkout dates (same day turnover)
        const overlaps = (newCheckIn < existingCheckOut) && (newCheckOut > existingCheckIn) &&
                        !(newCheckIn === existingCheckOut || newCheckOut === existingCheckIn);

        console.log(`  Overlap detected: ${overlaps}`);
        console.log(`    - newCheckIn (${newCheckIn}) < existingCheckOut (${existingCheckOut}): ${newCheckIn < existingCheckOut}`);
        console.log(`    - newCheckOut (${newCheckOut}) > existingCheckIn (${existingCheckIn}): ${newCheckOut > existingCheckIn}`);
        console.log(`    - Allowing check-in on checkout date: ${newCheckIn === existingCheckOut ? 'YES (no overlap)' : 'N/A'}`);

        if (overlaps) {
          console.warn('⚠️ OVERLAP DETECTED with booking:', booking.id, '- Guest:', booking.primary_guest_name);
        }

        return overlaps;
      }) || [];

      console.log(`✓ Overlap check complete: Found ${overlappingBookings.length} overlapping booking(s)`);

      return {
        hasOverlap: overlappingBookings.length > 0,
        overlappingBookings
      };
    } catch (error) {
      console.error('Error checking overlapping bookings:', error);
      throw error;
    }
  }
} 