import { formatPublicUrl, formatDateTime, isDevelopment } from './utils.ts';
import { GuestFormData } from './types.ts';
import { BookingStatus, STATUS_CALENDAR_META, buildCalendarSummary } from './statusMachine.ts';
import dayjs from 'https://esm.sh/dayjs@1.11.10';

export class CalendarService {
  static async createOrUpdateCalendarEvent(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId?: string, isTestingMode = false) {
    try {
      console.log('Creating or updating calendar event...');
      
      const credentials = await this.getCredentials();
      const eventData = this.createEventData(bookingId, formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, isTestingMode);

      // If bookingId exists, try to find and delete existing calendar event
      if (bookingId) {
        const existingEventId = await this.findExistingEvent(credentials, bookingId);
        if (existingEventId) {
          await this.deleteCalendarEvent(credentials, existingEventId);
        }
      }

      // Create new event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...eventData,
            extendedProperties: {
              private: {
                bookingId: bookingId || ''
              }
            }
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Calendar API Response:', { status: response.status, error });
        throw new Error(`Failed to create calendar event: ${JSON.stringify(error)}`);
      }

      console.log('Calendar event created successfully');
      return await response.json();
    } catch (error) {
      console.error('Error with calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  private static async findExistingEvent(credentials: any, bookingId: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      return await this.findExistingEventId(credentials, accessToken, bookingId);
    } catch (error) {
      console.error('Error finding existing event:', error);
      return null;
    }
  }

  private static async deleteCalendarEvent(credentials: any, eventId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        console.error('Delete Calendar Event Error:', { status: response.status, error });
        throw new Error(`Failed to delete calendar event: ${error}`);
      }

      console.log('Calendar event deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  /**
   * Updates (or creates if missing) a calendar event to reflect the new booking status.
   * Called by workflowOrchestrator on every transition.
   *
   * - If an existing event is found → PATCH summary + colorId.
   * - If no event is found and `booking` is provided → CREATE a new event from DB row.
   * - If credentials are missing → skip gracefully.
   *
   * @param bookingId  The booking whose calendar event to update.
   * @param status     The new booking status (used for colorId + label).
   * @param pax        Total guests (adults + children).
   * @param nights     Number of nights.
   * @param guestName  Guest Facebook/display name.
   * @param isTest     Whether this is a test booking (prepends [TEST]).
   * @param booking    Full DB row — used to create a new event when none exists.
   */
  static async updateCalendarEventStatus(
    bookingId: string,
    status: BookingStatus,
    pax: number,
    nights: number,
    guestName: string,
    isTest = false,
    booking?: any,
  ): Promise<{ success: boolean; updated: number; skipped?: boolean; created?: boolean }> {
    try {
      console.log(`Updating calendar event status → ${status} for booking: ${bookingId}`);

      const credentials = this.getCredentialsSafe();
      if (!credentials) {
        console.log('Google Calendar credentials not found, skipping calendar update');
        return { success: true, updated: 0, skipped: true };
      }

      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      const existingEventId = await this.findExistingEventId(
        { calendarId: credentials.calendarId },
        accessToken,
        bookingId,
      );

      const meta = STATUS_CALENDAR_META[status];
      const summary = buildCalendarSummary(status, pax, nights, guestName, isTest);

      if (!existingEventId) {
        if (!booking) {
          console.log(`No calendar event found for booking ${bookingId} (no booking data to create one)`);
          return { success: true, updated: 0 };
        }

        // Create a brand-new event from the DB row
        console.log(`No calendar event found — creating new event for booking ${bookingId}`);
        const eventData = this.buildEventDataFromDbRow(booking, status, pax, nights, summary, isTest);

        const createRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...eventData,
              extendedProperties: { private: { bookingId } },
            }),
          },
        );

        if (!createRes.ok) {
          const err = await createRes.text();
          throw new Error(`Failed to create calendar event: ${createRes.status} ${err}`);
        }

        console.log(`Calendar event created: "${summary}" colorId=${meta.colorId}`);
        return { success: true, updated: 1, created: true };
      }

      // Patch the existing event
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId!)}/events/${existingEventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ summary, colorId: meta.colorId }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to patch calendar event: ${response.status} ${err}`);
      }

      console.log(`Calendar event updated: "${summary}" colorId=${meta.colorId}`);
      return { success: true, updated: 1 };
    } catch (error) {
      console.error('Error updating calendar event status:', error);
      return { success: false, updated: 0 };
    }
  }

  /**
   * Builds a Google Calendar event body from a raw DB booking row.
   * Used when creating a brand-new event during a transition (no prior event exists).
   */
  private static buildEventDataFromDbRow(
    booking: any,
    status: BookingStatus,
    pax: number,
    nights: number,
    summary: string,
    isTest: boolean,
  ) {
    const adminLink = `https://kamehomes.space/bookings/${booking.id}`;
    const isTestingMode = isTest;
    const testPrefix = isTestingMode ? '[TEST] ' : '';

    const needParking = booking.need_parking === true || booking.need_parking === 'true';
    const hasPets = booking.has_pets === true || booking.has_pets === 'true';

    const description = `
<a href="${adminLink}">View Booking in Admin</a>

<strong>Guest Information</strong>
Facebook/Airbnb Name: ${booking.guest_facebook_name ?? ''}
Primary Guest: ${testPrefix}${booking.primary_guest_name ?? ''}
Email: ${booking.guest_email ?? ''}
Phone Number: ${booking.guest_phone_number ?? ''}
Address: ${booking.guest_address ?? ''}
Nationality: ${booking.nationality ?? ''}

<strong>Additional Guests</strong>
${[booking.guest2_name, booking.guest3_name, booking.guest4_name, booking.guest5_name].filter(Boolean).length === 0
  ? 'No additional guests'
  : [
      booking.guest2_name ? `Guest 2: ${booking.guest2_name}` : '',
      booking.guest3_name ? `Guest 3: ${booking.guest3_name}` : '',
      booking.guest4_name ? `Guest 4: ${booking.guest4_name}` : '',
      booking.guest5_name ? `Guest 5: ${booking.guest5_name}` : '',
    ].filter(Boolean).join('\n')}

<strong>Stay Details</strong>
Check-in Date: ${booking.check_in_date ?? ''}
Check-out Date: ${booking.check_out_date ?? ''}
Check-in Time: ${booking.check_in_time ?? ''}
Check-out Time: ${booking.check_out_time ?? ''}
Number of Nights: ${nights}
Number of Adults: ${booking.number_of_adults ?? ''}
Number of Children: ${booking.number_of_children ?? 0}

<strong>Parking Information</strong>
${needParking
  ? `Parking Required: Yes\nCar Plate: ${booking.car_plate_number || 'N/A'}\nCar Brand/Model: ${booking.car_brand_model || 'N/A'}\nCar Color: ${booking.car_color || 'N/A'}`
  : 'Parking Required: No'}

<strong>Pet Information</strong>
${hasPets
  ? `Has Pets: Yes\nPet Name: ${booking.pet_name || 'N/A'}\nPet Type: ${booking.pet_type || 'N/A'}\nPet Breed: ${booking.pet_breed || 'N/A'}\nPet Age: ${booking.pet_age || 'N/A'}\nVaccination Date: ${booking.pet_vaccination_date || 'N/A'}${booking.pet_image_url ? `\n<a href="${booking.pet_image_url}">Pet Image</a>` : ''}${booking.pet_vaccination_url ? `\n<a href="${booking.pet_vaccination_url}">Vaccination Record</a>` : ''}`
  : 'Has Pets: No'}

<strong>Documents</strong>
${booking.payment_receipt_url ? `<a href="${booking.payment_receipt_url}">Payment Receipt</a>` : 'No payment receipt'}
${booking.valid_id_url ? `<a href="${booking.valid_id_url}">Valid ID</a>` : 'No valid ID'}
    `.trim();

    // Build start/end datetimes from MM-DD-YYYY
    const checkInDate = dayjs(booking.check_in_date, 'MM-DD-YYYY');
    const endDate = checkInDate.add(nights - 1, 'day');

    const toISO = (date: typeof dayjs.prototype, time?: string): string => {
      const t = time ?? '14:00';
      const [h, m] = t.split(':');
      return date
        .hour(parseInt(h ?? '14', 10))
        .minute(parseInt(m ?? '0', 10))
        .second(0)
        .toISOString()
        .replace(/Z$/, '+08:00');
    };

    return {
      summary,
      description,
      start: { dateTime: toISO(checkInDate, booking.check_in_time), timeZone: 'Asia/Manila' },
      end: { dateTime: toISO(endDate, booking.check_out_time ?? '23:59'), timeZone: 'Asia/Manila' },
      colorId: STATUS_CALENDAR_META[status].colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };
  }

  /** Finds the Google Calendar event ID for a booking, or null if not found. */
  private static async findExistingEventId(
    credentials: any,
    accessToken: string,
    bookingId: string,
  ): Promise<string | null> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events?privateExtendedProperty=bookingId=${bookingId}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.items?.[0]?.id ?? null;
  }

  /**
   * Creates the event data object for Google Calendar
   */
  private static createEventData(bookingId: string, formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, isTestingMode = false) {
    const pax = +formData.numberOfAdults + +(formData.numberOfChildren || 0);
    const nights = formData.numberOfNights || 1;

    // Use the PENDING_REVIEW status for initial event creation (Q: the submit-form
    // side effects will move to the orchestrator in Phase 5; for now keep using
    // PENDING_REVIEW color on initial creation).
    const summary = buildCalendarSummary('PENDING_REVIEW', pax, nights, formData.guestFacebookName, isTestingMode);

    // Admin link — no ?dev=true / ?testing=true per Q7.3 (admin session handles auth)
    const adminLink = `https://kamehomes.space/bookings/${bookingId}`;
    
    const eventDescription = `
<a href="${adminLink}">View Booking in Admin</a>

<strong>Guest Information</strong>
Facebook/Airbnb Name: ${formData.guestFacebookName}
Primary Guest: ${formData.primaryGuestName}
Email: ${formData.guestEmail}
Phone Number: ${formData.guestPhoneNumber}
Address: ${formData.guestAddress}
Nationality: ${formData.nationality}

<strong>Additional Guests</strong>
${!formData.guest2Name && !formData.guest3Name && !formData.guest4Name && !formData.guest5Name ? 'No additional guest\n' : `${formData.guest2Name ? `Guest 2: ${formData.guest2Name}\n` : ''}${formData.guest3Name ? `Guest 3: ${formData.guest3Name}\n` : ''}${formData.guest4Name ? `Guest 4: ${formData.guest4Name}\n` : ''}${formData.guest5Name ? `Guest 5: ${formData.guest5Name}\n` : ''}`}
<strong>Stay Details</strong>
Check-in Date: ${formData.checkInDate}
Check-out Date: ${formData.checkOutDate}
Check-in Time: ${formData.checkInTime}
Check-out Time: ${formData.checkOutTime}
Number of Nights: ${formData.numberOfNights}
Number of Adults: ${formData.numberOfAdults}
Number of Children: ${formData.numberOfChildren}

<strong>Parking Information</strong>
${formData.needParking === 'true' ? `Parking Required: Yes
Car Plate: ${formData.carPlateNumber || 'N/A'}
Car Brand/Model: ${formData.carBrandModel || 'N/A'}
Car Color: ${formData.carColor || 'N/A'}` : 'Parking Required: No'}

<strong>Pet Information</strong>
${formData.hasPets === 'true' ? `Has Pets: Yes
Pet Name: ${formData.petName || 'N/A'}
Pet Type: ${formData.petType || 'N/A'}
Pet Breed: ${formData.petBreed || 'N/A'}
Pet Age: ${formData.petAge || 'N/A'}
Vaccination Date: ${formData.petVaccinationDate || 'N/A'}
${petImageUrl ? `<a href="${petImageUrl}">Pet Image</a>` : ''}
${petVaccinationUrl ? `<a href="${petVaccinationUrl}">Vaccination Record</a>` : ''}` : 'Has Pets: No'}

<strong>Additional Information</strong>
How Found Us: ${formData.findUs}${formData.findUsDetails ? `\nDetails: ${formData.findUsDetails}` : ''}
Special Requests: ${formData.guestSpecialRequests || 'None'}

<strong>Documents</strong>
<a href="${paymentReceiptUrl}">Payment Receipt</a>
<a href="${validIdUrl}">Valid ID</a>
    `.trim();

    const checkInDateTime = formatDateTime(formData.checkInDate, formData.checkInTime);
    
    // Calculate the end date based on number of nights
    const checkInDate = dayjs(formData.checkInDate);
    const endDate = checkInDate.add(formData.numberOfNights - 1, 'day');
    const endDateTime = formatDateTime(endDate.format('MM-DD-YYYY'), '23:59');

    return {
      summary,
      description: eventDescription,
      start: {
        dateTime: checkInDateTime,
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Manila',
      },
      colorId: STATUS_CALENDAR_META['PENDING_REVIEW'].colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };
  }

  /**
   * Gets and validates required credentials.
   * Throws when called from the main createOrUpdateCalendarEvent path.
   */
  private static async getCredentials() {
    const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    
    if (!serviceAccount || !calendarId) {
      throw new Error('Missing Google Calendar credentials');
    }

    return {
      serviceAccount: JSON.parse(serviceAccount),
      calendarId
    };
  }

  /** Same as getCredentials() but returns null instead of throwing. */
  private static getCredentialsSafe(): { serviceAccount: any; calendarId: string } | null {
    try {
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      if (!serviceAccount || !calendarId) return null;
      return { serviceAccount: JSON.parse(serviceAccount), calendarId };
    } catch {
      return null;
    }
  }

  /**
   * Generates a JWT token and exchanges it for a Google OAuth access token
   */
  private static async getAccessToken(credentials: any) {
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: 'RS256', typ: 'JWT' };
    const jwtClaimSet = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/calendar.events',
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
