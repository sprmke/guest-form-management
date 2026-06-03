import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { GuestFormData, GuestSubmission, transformFormToSubmission } from './types.ts'
import {
  pendingDocumentsClearPatchForGuestEditRevert,
  shouldRevertGuestFieldEditsToPendingReview,
} from './statusMachine.ts'
import { UploadService } from './uploadService.ts'
import { formatDate, formatTime, DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME, formatPublicUrl } from './utils.ts'
import {
  compareBookingsForListSort,
  manilaTodayIso,
  matchesDefaultBookingsListVisibility,
  passesListCheckInDateRangeFilter,
  type BookingsListSort,
} from './bookingsListSort.ts'

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
      const parkingCheckInDate =
        formatDate(data.parking_check_in_date) || checkInDate;
      const parkingCheckOutDate =
        formatDate(data.parking_check_out_date) || checkOutDate;
      const parkingSameAsBookingDuration =
        parkingCheckInDate === checkInDate &&
        parkingCheckOutDate === checkOutDate;

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
        bookingSource: data.booking_source || 'Facebook',
        guestRequestsSurpriseDecor: !!data.guest_requests_surprise_decor,
        needParking: data.need_parking || false,
        parkingSameAsBookingDuration,
        parkingCheckInDate,
        parkingCheckOutDate,
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

  static async processFormData(
    formData: FormData,
    saveToDatabase = true,
    saveImagesToStorage = true,
    revertReadyForCheckinToPendingReview = false,
  ): Promise<{ data: GuestFormData; submissionData: any; validIdUrl: string; paymentReceiptUrl: string; petVaccinationUrl?: string; petImageUrl?: string }> {
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
      
      if (hasPets) {
        // Handle pet vaccination upload
        if (petVaccination) {
          const petVaccinationFileName = formData.get('petVaccinationFileName') as string;
          const prefixedFileName = petVaccinationFileName;
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
          const prefixedFileName = petImageFileName;
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

      // Get the downpayment receipt file (FormData: paymentReceipt → payment_receipt_url)
      const paymentReceipt = formData.get('paymentReceipt') as File;
      if (paymentReceipt) {
        const paymentReceiptFileName = formData.get('paymentReceiptFileName') as string;
        const prefixedFileName = paymentReceiptFileName;
        if (saveImagesToStorage) {
          paymentReceiptUrl = await UploadService.uploadPaymentReceipt(paymentReceipt, prefixedFileName);
        } else {
          console.log('⚠️ Skipping downpayment receipt upload (saveImagesToStorage=false)');
          paymentReceiptUrl = 'dev-mode-skipped';
        }
      } else if (existingBooking) {
        paymentReceiptUrl = existingBooking.payment_receipt_url;
      } else if (!saveImagesToStorage) {
        paymentReceiptUrl = 'dev-mode-skipped';
      } else {
        throw new Error('Downpayment receipt is required');
      }

      // Get the valid ID file
      const validId = formData.get('validId') as File;
      if (validId) {
        const validIdFileName = formData.get('validIdFileName') as string;
        const prefixedFileName = validIdFileName;
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
        throw new Error('Failed to upload downpayment receipt');
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
      );

      // Save or update in database using the booking ID
      let submissionData;
      if (saveToDatabase) {
        if (existingBooking) {
          const patch: GuestSubmission = { ...dbData };
          if (
            revertReadyForCheckinToPendingReview &&
            shouldRevertGuestFieldEditsToPendingReview(existingBooking.status)
          ) {
            Object.assign(patch, pendingDocumentsClearPatchForGuestEditRevert());
            patch.status = 'PENDING_REVIEW';
            patch.status_updated_at = new Date().toISOString();
          }
          submissionData = await this.updateGuestSubmission(bookingId, patch);
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

  // ─── Phase 3 helpers ────────────────────────────────────────────────────────

  /**
   * Fetch a single booking row by ID (used by orchestrator + transition endpoint).
   * Returns null when not found.
   */
  static async getBookingById(bookingId: string) {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch booking ${bookingId}: ${error.message}`);
    }

    return data;
  }

  /**
   * Update `status` + `status_updated_at` for a booking.
   * Only the orchestrator should call this — no side effects here.
   */
  static async updateBookingStatus(bookingId: string, status: string) {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .update({ status, status_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update booking status: ${error.message}`);
    return data;
  }

  /**
   * Patch arbitrary workflow-phase fields onto a booking row (pricing, parking,
   * SD refund fields, approved PDF URLs, etc.).  Called by the orchestrator after
   * validating the transition.
   */
  static async setWorkflowFields(bookingId: string, fields: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new Error(`Failed to set workflow fields: ${error.message}`);
    return data;
  }

  /**
   * Paginated, filtered, sorted booking list for the admin `list-bookings` function.
   *
   * Dates in `check_in_date` are stored as `MM-DD-YYYY` text. To sort correctly
   * across year boundaries we convert to `YYYY-MM-DD` via a Postgres expression
   * in a `rpc` call — or fall back to `created_at` when the column isn't sortable.
   *
   * Sorting approach: we fetch the full result set for the current page using the
   * PostgREST range API.  For `check_in_date` sorting we convert in JS (fast enough
   * for admin pages with ≤1000 active rows).
   */
  static async listBookings(params: {
    q?: string;
    status?: string[];
    from?: string | null;   // YYYY-MM-DD
    to?: string | null;     // YYYY-MM-DD
    hasPets?: boolean | null;
    needParking?: boolean | null;
    sort?:
      | 'status_priority:asc'
      | 'check_in_date:asc'
      | 'check_in_date:desc'
      | 'created_at:asc'
      | 'created_at:desc';
    page?: number;
    limit?: number;
    /** When true, include COMPLETED rows (cancelled stays hidden unless status filter). */
    showCompletedBookings?: boolean;
  }) {
    const {
      q = '',
      status = [],
      from = null,
      to = null,
      hasPets = null,
      needParking = null,
      sort = 'status_priority:asc',
      page = 1,
      limit = 25,
      showCompletedBookings = false,
    } = params;

    const todayManila = manilaTodayIso();

    let request = this.supabase
      .from('guest_submissions')
      .select('*', { count: 'exact' });

    // --- Filters ---
    // Free-text search now spans the full guest record:
    //   • Primary guest fields  : facebook name, primary name, email, phone, address, nationality
    //   • Additional guests     : guest2…guest5_name
    //   • Pet                   : pet_name, pet_type, pet_breed
    //   • Parking               : car_plate_number, car_brand_model, car_color
    //   • Notes / source        : guest_special_requests, find_us_details
    // PostgREST `or()` joins each clause as a comma-separated `<col>.ilike.<needle>`.
    if (q.trim()) {
      const needle = `%${q.trim()}%`;
      request = request.or(
        [
          // Primary guest
          `guest_facebook_name.ilike.${needle}`,
          `primary_guest_name.ilike.${needle}`,
          `guest_email.ilike.${needle}`,
          `guest_phone_number.ilike.${needle}`,
          `guest_address.ilike.${needle}`,
          `nationality.ilike.${needle}`,
          // Additional guests
          `guest2_name.ilike.${needle}`,
          `guest3_name.ilike.${needle}`,
          `guest4_name.ilike.${needle}`,
          `guest5_name.ilike.${needle}`,
          // Pet
          `pet_name.ilike.${needle}`,
          `pet_type.ilike.${needle}`,
          `pet_breed.ilike.${needle}`,
          // Parking
          `car_plate_number.ilike.${needle}`,
          `car_brand_model.ilike.${needle}`,
          `car_color.ilike.${needle}`,
          // Free-text notes
          `guest_special_requests.ilike.${needle}`,
          `find_us_details.ilike.${needle}`,
        ].join(','),
      );
    }

    if (status.length > 0) {
      request = request.in('status', status);
    }

    if (hasPets === true) request = request.eq('has_pets', true);
    if (hasPets === false) request = request.eq('has_pets', false);

    if (needParking === true) request = request.eq('need_parking', true);
    if (needParking === false) request = request.eq('need_parking', false);

    // Fetch all matching rows first (required for MM-DD-YYYY client-side sort)
    // Then paginate in memory. This is acceptable for admin (≤ a few thousand rows).
    const { data: allData, error, count } = await request.order('created_at', { ascending: false });

    if (error) throw new Error(`listBookings query failed: ${error.message}`);

    let rows = (allData ?? []) as any[];

    // Date-range filter — PENDING_REVIEW always included (see passesListCheckInDateRangeFilter)
    if (from || to) {
      rows = rows.filter((r) =>
        passesListCheckInDateRangeFilter(r, from, to)
      );
    }

    // Default list: hide cancelled + completed unless toggle is on
    rows = rows.filter((r) =>
      matchesDefaultBookingsListVisibility(r, showCompletedBookings),
    );

    const listSort = sort as BookingsListSort;
    rows.sort((a, b) =>
      compareBookingsForListSort(a, b, listSort, todayManila)
    );

    // Paginate
    const total = rows.length;
    const from_idx = (page - 1) * limit;
    const paged = rows.slice(from_idx, from_idx + limit);

    return { rows: paged, total };
  }

  // ─────────────────────────────────────────────────────────────────────────────

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
      
      // Phase 2+: only CANCELLED bookings free dates — every other status blocks.
      // We push the CANCELLED filter to the DB query for efficiency.
      // Belt-and-suspenders: legacy 'canceled' is also excluded in JS below.
      let query = this.supabase
        .from('guest_submissions')
        .select('id, check_in_date, check_out_date, status, primary_guest_name')
        .neq('status', 'CANCELLED');

      // Exclude the current booking if updating
      if (bookingId) {
        query = query.neq('id', bookingId);
      }

      const { data: allBookings, error } = await query;

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to check for overlapping bookings');
      }

      // Belt-and-suspenders: also filter legacy 'canceled' rows in case the
      // Phase 2 migration hasn't been applied on a fresh local clone.
      const activeBookings = allBookings?.filter(
        booking => booking.status !== 'canceled' && booking.status !== 'CANCELLED'
      ) || [];

      console.log(`Found ${allBookings?.length || 0} non-CANCELLED bookings, ${activeBookings.length} active bookings to check for overlaps`);

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

  /**
   * All non-cancelled stays for calendar availability / Telegram marketing copy.
   */
  static async listBookingRangesForAvailability(): Promise<
    { checkInYmd: string; checkOutYmd: string }[]
  > {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .select('check_in_date, check_out_date, status')
      .neq('status', 'CANCELLED');

    if (error) {
      console.error('listBookingRangesForAvailability:', error);
      throw new Error('Failed to load booking ranges');
    }

    const normalizeDate = (dateStr: string): string | null => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    };

    const rows = (data ?? []).filter(
      (r) => r.status !== 'canceled' && r.status !== 'CANCELLED',
    );

    const out: { checkInYmd: string; checkOutYmd: string }[] = [];
    for (const r of rows) {
      const ci = normalizeDate(r.check_in_date);
      const co = normalizeDate(r.check_out_date);
      if (ci && co && ci < co) out.push({ checkInYmd: ci, checkOutYmd: co });
    }
    return out;
  }

  static async getTelegramMarketingSettings(): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('telegram_marketing_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('getTelegramMarketingSettings:', error);
      const pg = `${error.code ?? ''} ${error.message ?? ''}`.trim();
      throw new Error(
        `Failed to load Telegram marketing settings${pg ? `: ${pg}` : ''}. ` +
          `On production this usually means the table is missing — run migration ` +
          `20260614120000_telegram_marketing_settings.sql (or “supabase db push”) on this project.`,
      );
    }
    return data;
  }

  static async updateTelegramMarketingSettings(
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('telegram_marketing_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('updateTelegramMarketingSettings:', error);
      throw new Error('Failed to update Telegram marketing settings');
    }
    return data;
  }

  static async getAppSettings(): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('getAppSettings:', error);
      throw new Error(
        `Failed to load app settings: ${error.message}. ` +
          `Run migration 20260701120000_app_settings.sql on this project.`,
      );
    }
    return data;
  }

  static async updateAppSettings(
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('app_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('updateAppSettings:', error);
      throw new Error(
        `Failed to update app settings: ${error.message ?? 'unknown error'}`,
      );
    }
    return data;
  }

  static async syncTelegramMarketingDailyCronJobs(
    slots: { hour: number; minute: number }[],
  ): Promise<{ ok?: boolean; error?: string; scheduled?: number }> {
    const { data, error } = await this.supabase.rpc('sync_telegram_marketing_daily_cron_jobs', {
      p_slots: slots as never,
    });
    if (error) {
      console.error('syncTelegramMarketingDailyCronJobs rpc:', error);
      return { ok: false, error: error.message ?? 'rpc failed' };
    }
    if (data && typeof data === 'object' && data !== null) {
      return data as { ok?: boolean; error?: string; scheduled?: number };
    }
    return { ok: false, error: 'unexpected rpc response' };
  }

  static async getTelegramStaffSettings(): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('telegram_staff_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('getTelegramStaffSettings:', error);
      const pg = `${error.code ?? ''} ${error.message ?? ''}`.trim();
      throw new Error(
        `Failed to load Telegram staff settings${pg ? `: ${pg}` : ''}. ` +
          `On production this usually means the table is missing — run migration ` +
          `20260622120000_telegram_staff_settings.sql (or "supabase db push") on this project.`,
      );
    }
    return data;
  }

  static async updateTelegramStaffSettings(
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('telegram_staff_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('updateTelegramStaffSettings:', error);
      throw new Error('Failed to update Telegram staff settings');
    }
    return data;
  }

  static async syncTelegramStaffDailyCronJob(
    slot: { hour: number; minute: number },
  ): Promise<{ ok?: boolean; error?: string; cronExpr?: string }> {
    const { data, error } = await this.supabase.rpc('sync_telegram_staff_daily_cron_job', {
      p_slot: slot as never,
    });
    if (error) {
      console.error('syncTelegramStaffDailyCronJob rpc:', error);
      return { ok: false, error: error.message ?? 'rpc failed' };
    }
    if (data && typeof data === 'object' && data !== null) {
      return data as { ok?: boolean; error?: string; cronExpr?: string };
    }
    return { ok: false, error: 'unexpected rpc response' };
  }

  static async getTelegramAdminSettings(): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('telegram_admin_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('getTelegramAdminSettings:', error);
      const pg = `${error.code ?? ''} ${error.message ?? ''}`.trim();
      throw new Error(
        `Failed to load Telegram admin settings${pg ? `: ${pg}` : ''}. ` +
          `Run migration 20260702120000_telegram_admin_settings.sql on this project.`,
      );
    }
    return data;
  }

  static async updateTelegramAdminSettings(
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('telegram_admin_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('updateTelegramAdminSettings:', error);
      throw new Error('Failed to update Telegram admin settings');
    }
    return data;
  }

  static async syncTelegramAdminHourlyCronJob(): Promise<{
    ok?: boolean;
    error?: string;
    cronExpr?: string;
  }> {
    const { data, error } = await this.supabase.rpc('sync_telegram_admin_hourly_cron_job');
    if (error) {
      console.error('syncTelegramAdminHourlyCronJob rpc:', error);
      return { ok: false, error: error.message ?? 'rpc failed' };
    }
    if (data && typeof data === 'object' && data !== null) {
      return data as { ok?: boolean; error?: string; cronExpr?: string };
    }
    return { ok: false, error: 'unexpected rpc response' };
  }
} 