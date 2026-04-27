import dayjs from 'https://esm.sh/dayjs@1.11.10'
import { GuestFormData } from './types.ts';
import { isDevelopment } from './utils.ts';

export class SheetsService {
  static async appendToSheet(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId: string, isTestingMode = false) {
    try {
      console.log('Processing Google Sheet operation...');
      
      if (!bookingId) {
        throw new Error('Booking ID is required for Google Sheets operation');
      }

      const credentials = await this.getCredentials();
      
      // Try to find existing row with this bookingId
      const existingRow = await this.findRowByBookingId(credentials, bookingId);
      
      if (existingRow) {
        // For updates, preserve the original created_at timestamp
        const values = this.formatDataForSheet(formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, bookingId, isTestingMode, existingRow.createdAt);
        // Update existing row
        await this.updateRow(credentials, existingRow.rowIndex, values);
        console.log('Updated existing row in Google Sheet');
        return;
      }

      // If row not found, append new row
      const values = this.formatDataForSheet(formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, bookingId, isTestingMode);

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [values]
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Sheets API Response:', { status: response.status, error });
        throw new Error(`Failed to append to sheet: ${JSON.stringify(error)}`);
      }

      console.log('New row appended to sheet successfully');
      return await response.json();
    } catch (error) {
      console.error('Error with Google Sheet operation:', error);
      throw new Error('Failed to process Google Sheet operation');
    }
  }

  private static async findRowByBookingId(credentials: any, bookingId: string): Promise<{ rowIndex: number; createdAt: string } | null> {
    try {
      // Get all values from the sheet (extended to AK for status column)
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/A:AK`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
          },
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error(
          'Sheets findRowByBookingId GET failed:',
          response.status,
          errBody.slice(0, 500),
        );
        throw new Error('Failed to fetch sheet data');
      }

      const data = await response.json();
      const values = data.values || [];

      // Find the row with matching bookingId (assuming bookingId is in the first column)
      for (let i = 1; i < values.length; i++) { // Start from 1 to skip header row
        if (values[i] && values[i][0] === bookingId) { // Check the bookingId column (now first column)
          return { 
            rowIndex: i + 1, // Add 1 because Sheets API is 1-indexed
            createdAt: values[i][32] || '' // Get the existing created_at timestamp
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding row:', error);
      return null;
    }
  }

  private static async updateRow(credentials: any, rowIndex: number, values: string[]) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/A${rowIndex}:AK${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [values]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update row: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  private static formatDataForSheet(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId: string, isTestingMode = false, createdAt?: string): string[] {
    const currentTimestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const testPrefix = isTestingMode ? '[TEST] ' : '';
    
    return [
      bookingId,                          // A: Booking ID
      `${testPrefix}${formData.guestFacebookName}`,         // B: Facebook/Airbnb Name
      `${testPrefix}${formData.primaryGuestName}`,          // C: Primary Guest Name
      formData.guestEmail,                // D: Email
      formData.guestPhoneNumber,          // E: Phone Number
      formData.guestAddress,              // F: Address
      formData.nationality,               // G: Nationality
      formData.checkInDate,               // H: Check-in Date
      formData.checkInTime,               // I: Check-in Time
      formData.checkOutDate,              // J: Check-out Date
      formData.checkOutTime,              // K: Check-out Time
      formData.numberOfNights?.toString() || '', // L: Number of Nights
      formData.numberOfAdults.toString(), // M: Number of Adults
      formData.numberOfChildren.toString(), // N: Number of Children
      formData.guest2Name || '',          // O: Guest 2 Name
      formData.guest3Name || '',          // P: Guest 3 Name
      formData.guest4Name || '',          // Q: Guest 4 Name
      formData.guest5Name || '',          // R: Guest 5 Name
      formData.needParking === 'true' ? 'Yes' : 'No', // S: Need Parking
      formData.carPlateNumber || '',      // T: Car Plate Number
      formData.carBrandModel || '',       // U: Car Brand/Model
      formData.carColor || '',            // V: Car Color
      formData.hasPets === 'true' ? 'Yes' : 'No',    // W: Has Pets
      formData.petName || '',             // X: Pet Name
      formData.petBreed || '',            // Y: Pet Breed
      formData.petAge || '',              // Z: Pet Age
      formData.petVaccinationDate || '',  // AA: Pet Vaccination Date
      formData.findUs,                    // AB: How Found Us
      formData.findUsDetails || '',       // AC: Find Us Details
      formData.guestSpecialRequests || '', // AD: Special Requests
      validIdUrl,                          // AE: Valid ID URL
      paymentReceiptUrl,                   // AF: Payment Receipt URL
      petVaccinationUrl,                   // AG: Pet Vaccination URL
      petImageUrl,                         // AH: Pet Image URL
      createdAt || currentTimestamp,       // AI: Created At (use provided value or current timestamp)
      currentTimestamp,                    // AJ: Updated At (always current timestamp)
      'Booked',                            // AK: Status (Booked or Canceled)
    ];
  }

  /**
   * Updates (or creates if missing) the sheet row for a booking.
   * Called by the orchestrator on every transition.
   *
   * - If an existing row is found → update AK–AW columns with new status + workflow fields.
   * - If no row is found and `booking` is provided → append a full new row.
   * - If credentials are missing → skip gracefully.
   *
   * @param bookingId         UUID of the booking.
   * @param statusLabel       Human-readable label for AK (e.g. "Pending Review").
   * @param workflowFields    Optional additional fields to write (booking_rate, etc.)
   * @param booking           Full DB row — used to create a new row when none exists.
   */
  static async updateSheetWorkflowStatus(
    bookingId: string,
    statusLabel: string,
    workflowFields: {
      booking_rate?: number | null;
      down_payment?: number | null;
      balance?: number | null;
      security_deposit?: number | null;
      parking_rate_guest?: number | null;
      parking_rate_paid?: number | null;
      pet_fee?: number | null;
      approved_gaf_pdf_url?: string | null;
      approved_pet_pdf_url?: string | null;
      sd_refund_amount?: number | null;
      sd_refund_receipt_url?: string | null;
      status_updated_at?: string | null;
    } = {},
    booking?: any,
  ): Promise<{ success: boolean; skipped?: boolean; created?: boolean }> {
    try {
      console.log(`Updating sheet status → "${statusLabel}" for booking: ${bookingId}`);

      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');

      if (!serviceAccount || !spreadsheetId) {
        console.log('Google Sheets credentials not found, skipping sheet update');
        return { success: true, skipped: true };
      }

      const credentials = { serviceAccount: JSON.parse(serviceAccount), spreadsheetId };
      const accessToken = await this.getAccessToken(credentials.serviceAccount);

      const existingRow = await this.findRowByBookingId(credentials, bookingId);

      if (!existingRow) {
        if (!booking) {
          console.log(`No sheet row found for booking ${bookingId} (no booking data to create one)`);
          return { success: true, skipped: true };
        }

        // Append a brand-new row from the DB row
        console.log(`No sheet row found — appending new row for booking ${bookingId}`);
        const values = this.formatDbRowForSheet(booking, statusLabel, workflowFields);

        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [values] }),
          },
        );

        if (!appendRes.ok) {
          const err = await appendRes.json();
          console.error('Failed to append new sheet row:', err);
          return { success: false };
        }

        console.log(`Sheet row created for booking ${bookingId} → "${statusLabel}"`);
        return { success: true, created: true };
      }

      const { rowIndex } = existingRow;

      // Update AK–AW columns on the existing row
      const akUpdate = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/AK${rowIndex}:AW${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[
              statusLabel,                                          // AK: Status
              workflowFields.booking_rate?.toString() ?? '',        // AL: booking_rate
              workflowFields.down_payment?.toString() ?? '',        // AM: down_payment
              workflowFields.balance?.toString() ?? '',             // AN: balance
              workflowFields.security_deposit?.toString() ?? '',    // AO: security_deposit
              workflowFields.parking_rate_guest?.toString() ?? '',  // AP: parking_rate_guest
              workflowFields.parking_rate_paid?.toString() ?? '',   // AQ: parking_rate_paid
              workflowFields.pet_fee?.toString() ?? '',             // AR: pet_fee
              workflowFields.approved_gaf_pdf_url ?? '',            // AS: approved_gaf_pdf_url
              workflowFields.approved_pet_pdf_url ?? '',            // AT: approved_pet_pdf_url
              workflowFields.sd_refund_amount?.toString() ?? '',    // AU: sd_refund_amount
              workflowFields.sd_refund_receipt_url ?? '',           // AV: sd_refund_receipt_url
              workflowFields.status_updated_at ?? new Date().toISOString(), // AW: status_updated_at
            ]],
          }),
        },
      );

      if (!akUpdate.ok) {
        const err = await akUpdate.json();
        console.error('Failed to update sheet workflow columns:', err);
        return { success: false };
      }

      console.log(`Sheet updated: row ${rowIndex} → "${statusLabel}"`);
      return { success: true };
    } catch (error) {
      console.error('Error updating sheet workflow status:', error);
      return { success: false };
    }
  }

  /**
   * Formats a full sheet row (A–AW) from a raw DB booking row.
   * Used when appending a brand-new row for a booking that has no prior sheet entry.
   */
  private static formatDbRowForSheet(
    booking: any,
    statusLabel: string,
    workflowFields: {
      booking_rate?: number | null;
      down_payment?: number | null;
      balance?: number | null;
      security_deposit?: number | null;
      parking_rate_guest?: number | null;
      parking_rate_paid?: number | null;
      pet_fee?: number | null;
      approved_gaf_pdf_url?: string | null;
      approved_pet_pdf_url?: string | null;
      sd_refund_amount?: number | null;
      sd_refund_receipt_url?: string | null;
      status_updated_at?: string | null;
    } = {},
  ): string[] {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const isTest = booking.is_test_booking === true;
    const testPrefix = isTest ? '[TEST] ' : '';
    const needParking = booking.need_parking === true || booking.need_parking === 'true';
    const hasPets = booking.has_pets === true || booking.has_pets === 'true';

    return [
      booking.id ?? '',                                           // A: Booking ID
      `${testPrefix}${booking.guest_facebook_name ?? ''}`,        // B: Facebook/Airbnb Name
      `${testPrefix}${booking.primary_guest_name ?? ''}`,         // C: Primary Guest Name
      booking.guest_email ?? '',                                   // D: Email
      booking.guest_phone_number ?? '',                            // E: Phone Number
      booking.guest_address ?? '',                                 // F: Address
      booking.nationality ?? '',                                   // G: Nationality
      booking.check_in_date ?? '',                                 // H: Check-in Date
      booking.check_in_time ?? '',                                 // I: Check-in Time
      booking.check_out_date ?? '',                                // J: Check-out Date
      booking.check_out_time ?? '',                                // K: Check-out Time
      booking.number_of_nights?.toString() ?? '',                  // L: Number of Nights
      booking.number_of_adults?.toString() ?? '',                  // M: Number of Adults
      booking.number_of_children?.toString() ?? '0',              // N: Number of Children
      booking.guest2_name ?? '',                                   // O: Guest 2
      booking.guest3_name ?? '',                                   // P: Guest 3
      booking.guest4_name ?? '',                                   // Q: Guest 4
      booking.guest5_name ?? '',                                   // R: Guest 5
      needParking ? 'Yes' : 'No',                                  // S: Need Parking
      booking.car_plate_number ?? '',                              // T: Car Plate
      booking.car_brand_model ?? '',                               // U: Car Brand/Model
      booking.car_color ?? '',                                     // V: Car Color
      hasPets ? 'Yes' : 'No',                                      // W: Has Pets
      booking.pet_name ?? '',                                      // X: Pet Name
      booking.pet_breed ?? '',                                     // Y: Pet Breed
      booking.pet_age ?? '',                                       // Z: Pet Age
      booking.pet_vaccination_date ?? '',                          // AA: Vaccination Date
      booking.find_us ?? '',                                       // AB: How Found Us
      booking.find_us_details ?? '',                               // AC: Find Us Details
      booking.guest_special_requests ?? '',                        // AD: Special Requests
      booking.valid_id_url ?? '',                                  // AE: Valid ID URL
      booking.payment_receipt_url ?? '',                           // AF: Payment Receipt URL
      booking.pet_vaccination_url ?? '',                           // AG: Pet Vaccination URL
      booking.pet_image_url ?? '',                                 // AH: Pet Image URL
      booking.created_at ? dayjs(booking.created_at).format('YYYY-MM-DD HH:mm:ss') : now, // AI: Created At
      now,                                                         // AJ: Updated At
      statusLabel,                                                 // AK: Status
      workflowFields.booking_rate?.toString() ?? '',               // AL: booking_rate
      workflowFields.down_payment?.toString() ?? '',               // AM: down_payment
      workflowFields.balance?.toString() ?? '',                    // AN: balance
      workflowFields.security_deposit?.toString() ?? '',           // AO: security_deposit
      workflowFields.parking_rate_guest?.toString() ?? '',         // AP: parking_rate_guest
      workflowFields.parking_rate_paid?.toString() ?? '',          // AQ: parking_rate_paid
      workflowFields.pet_fee?.toString() ?? '',                    // AR: pet_fee
      workflowFields.approved_gaf_pdf_url ?? '',                   // AS: approved_gaf_pdf_url
      workflowFields.approved_pet_pdf_url ?? '',                   // AT: approved_pet_pdf_url
      workflowFields.sd_refund_amount?.toString() ?? '',           // AU: sd_refund_amount
      workflowFields.sd_refund_receipt_url ?? '',                  // AV: sd_refund_receipt_url
      workflowFields.status_updated_at ?? new Date().toISOString(), // AW: status_updated_at
    ];
  }

  private static async getCredentials() {
    const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
    
    if (!serviceAccount || !spreadsheetId) {
      throw new Error('Missing Google Sheets credentials');
    }

    return {
      serviceAccount: JSON.parse(serviceAccount),
      spreadsheetId
    };
  }

  private static async getAccessToken(credentials: any) {
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: 'RS256', typ: 'JWT' };
    const jwtClaimSet = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(jwtHeader));
    const encodedClaimSet = btoa(JSON.stringify(jwtClaimSet));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
    
    // Prepare private key for signing
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/-----BEGIN PRIVATE KEY-----\n/, '')
      .replace(/\n-----END PRIVATE KEY-----/, '')
      .trim();

    const binaryDer = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }
} 