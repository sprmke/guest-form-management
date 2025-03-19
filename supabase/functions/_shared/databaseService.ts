import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { GuestFormData, transformFormToSubmission } from './types.ts'
import { UploadService } from './uploadService.ts'
import { formatDate, formatTime, DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME, formatPublicUrl } from './utils.ts'

export class DatabaseService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async getFormData(bookingId: string) {
    console.log('Fetching form data for booking:', bookingId);
    
    try {
      const { data, error } = await this.supabase
        .from('guest_submissions')
        .select('*')
        .eq('id', bookingId)
        .single();

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
        petBreed: data.pet_breed || '',
        petAge: data.pet_age || '',
        petVaccinationDate: formatDate(data.pet_vaccination_date),
        petVaccinationUrl: formatPublicUrl(data.pet_vaccination_url) || '',
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

  static async processFormData(formData: FormData): Promise<{ data: GuestFormData; submissionData: any; validIdUrl: string; paymentReceiptUrl: string; petVaccinationUrl?: string; petImageUrl?: string }> {
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

      // Check if booking already exists using the booking ID
      const { data: existingBooking, error: fetchError } = await this.supabase
        .from('guest_submissions')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching existing booking:', fetchError);
        throw new Error('Failed to check for existing booking');
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
      
      if (hasPets) {
        // Handle pet vaccination upload
        if (petVaccination) {
          const petVaccinationFileName = formData.get('petVaccinationFileName') as string;
          petVaccinationUrl = await UploadService.uploadPetVaccination(petVaccination, petVaccinationFileName);
        } else if (existingBooking) {
          petVaccinationUrl = existingBooking.pet_vaccination_url;
        } else {
          throw new Error('Pet vaccination record is required when bringing pets');
        }

        // Handle pet image upload
        if (petImage) {
          const petImageFileName = formData.get('petImageFileName') as string;
          petImageUrl = await UploadService.uploadPetImage(petImage, petImageFileName);
        } else if (existingBooking) {
          petImageUrl = existingBooking.pet_image_url;
        } else {
          throw new Error('Pet image is required when bringing pets');
        }
      }

      // Get the payment receipt file
      const paymentReceipt = formData.get('paymentReceipt') as File;
      if (paymentReceipt) {
        const paymentReceiptFileName = formData.get('paymentReceiptFileName') as string;
        paymentReceiptUrl = await UploadService.uploadPaymentReceipt(paymentReceipt, paymentReceiptFileName);
      } else if (existingBooking) {
        paymentReceiptUrl = existingBooking.payment_receipt_url;
      } else {
        throw new Error('Payment receipt is required');
      }

      // Get the valid ID file
      const validId = formData.get('validId') as File;
      if (validId) {
        const validIdFileName = formData.get('validIdFileName') as string;
        validIdUrl = await UploadService.uploadValidId(validId, validIdFileName);
      } else if (existingBooking) {
        validIdUrl = existingBooking.valid_id_url;
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
        petImageUrl
      );

      // Save or update in database using the booking ID
      let submissionData;
      if (existingBooking) {
        submissionData = await this.updateGuestSubmission(bookingId, dbData);
      } else {
        submissionData = await this.saveGuestSubmission({ ...dbData, id: bookingId });
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
} 