import {
  buildGoogleCalendarDateTime,
  DEFAULT_CHECK_IN_TIME,
  formatDateTime,
  formatPublicUrl,
  isDevelopment,
  normalizeDateToYYYYMMDD,
} from './utils.ts';
import { GuestFormData } from './types.ts';
import { BookingStatus, STATUS_CALENDAR_META, buildCalendarSummary } from './statusMachine.ts';
import type { CalendarEventSnapshot } from './calendarRepair.ts';
import dayjs from 'https://esm.sh/dayjs@1.11.10';

export class CalendarService {
  static async createOrUpdateCalendarEvent(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId?: string) {
    try {
      console.log('Creating or updating calendar event...');
      
      const credentials = await this.getCredentials();
      const eventData = this.createEventData(bookingId, formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl);

      // If bookingId exists, try to find and delete existing calendar event
      if (bookingId) {
        const existingEventId = await this.findExistingEvent(credentials, bookingId, {
          check_in_date: formData.checkInDate,
          number_of_nights: formData.numberOfNights,
        });
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

  private static async findExistingEvent(
    credentials: { calendarId: string; serviceAccount: unknown },
    bookingId: string,
    booking?: { check_in_date?: string; number_of_nights?: number },
  ): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      return await this.findExistingEventId(
        { calendarId: credentials.calendarId },
        accessToken,
        bookingId,
        booking,
      );
    } catch (error) {
      console.error('Error finding existing event:', error);
      return null;
    }
  }

  static isConfigured(): boolean {
    return this.getCredentialsSafe() !== null;
  }

  static async obtainCalendarAccess(): Promise<
    { calendarId: string; accessToken: string } | null
  > {
    const credentials = this.getCredentialsSafe();
    if (!credentials) return null;
    const accessToken = await this.getAccessToken(credentials.serviceAccount);
    return { calendarId: credentials.calendarId, accessToken };
  }

  static async findEventIdForBooking(
    bookingId: string,
    booking?: unknown,
    access?: { calendarId: string; accessToken: string },
  ): Promise<string | null> {
    const ids = await this.findAllEventIdsForBooking(bookingId, booking, access);
    return ids[0] ?? null;
  }

  /** All calendar events tied to this booking (extended property, admin link, or date window). */
  static async findAllEventIdsForBooking(
    bookingId: string,
    booking?: unknown,
    access?: { calendarId: string; accessToken: string },
  ): Promise<string[]> {
    const ctx = access ?? await this.obtainCalendarAccess();
    if (!ctx) return [];
    return await this.collectAllEventIds(
      { calendarId: ctx.calendarId },
      ctx.accessToken,
      bookingId,
      booking,
    );
  }

  static async getCalendarEventSnapshot(
    eventId: string,
    access: { calendarId: string; accessToken: string },
  ): Promise<CalendarEventSnapshot | null> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(access.calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${access.accessToken}` } },
    );
    if (!response.ok) return null;
    const ev = await response.json();
    const startDateTime = String(ev.start?.dateTime ?? ev.start?.date ?? '');
    return { summary: String(ev.summary ?? ''), startDateTime };
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
   * @param booking    Full DB row — used to create a new event when none exists.
   */
  static async updateCalendarEventStatus(
    bookingId: string,
    status: BookingStatus,
    pax: number,
    nights: number,
    guestName: string,
    booking?: any,
    options?: {
      /** When set (e.g. from backfill assessment), patch these IDs directly. */
      eventIds?: string[];
      access?: { calendarId: string; accessToken: string };
    },
  ): Promise<{ success: boolean; updated: number; skipped?: boolean; created?: boolean; error?: string }> {
    try {
      console.log(`Updating calendar event status → ${status} for booking: ${bookingId}`);

      const credentials = this.getCredentialsSafe();
      if (!credentials) {
        console.log('Google Calendar credentials not found, skipping calendar update');
        return { success: true, updated: 0, skipped: true };
      }

      const calendarId = options?.access?.calendarId ?? credentials.calendarId;
      const accessToken = options?.access?.accessToken
        ?? await this.getAccessToken(credentials.serviceAccount);

      const eventIds = options?.eventIds?.length
        ? options.eventIds
        : await this.collectAllEventIds(
          { calendarId },
          accessToken,
          bookingId,
          booking,
        );

      const meta = STATUS_CALENDAR_META[status];
      const summary = buildCalendarSummary(status, pax, nights, guestName, booking);

      if (eventIds.length === 0) {
        if (!booking) {
          console.log(`No calendar event found for booking ${bookingId} (no booking data to create one)`);
          return { success: true, updated: 0 };
        }

        // Create a brand-new event from the DB row
        console.log(`No calendar event found — creating new event for booking ${bookingId}`);
        const eventData = this.buildEventDataFromDbRow(booking, status, pax, nights, summary);

        const createRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
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

      // Patch the existing event: summary/color, full description, and stay
      // window (start/end) when we have the DB row — keeps Google in sync after
      // admin edits to dates, guest block, or surprise decor without a transition.
      const patchBody: Record<string, unknown> = {
        summary,
        colorId: meta.colorId,
        extendedProperties: { private: { bookingId } },
      };
      if (booking) {
        const eventData = this.buildEventDataFromDbRow(booking, status, pax, nights, summary);
        patchBody.description = eventData.description;
        patchBody.start = eventData.start;
        patchBody.end = eventData.end;
      }

      let patched = 0;
      for (const eventId of eventIds) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patchBody),
          },
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Failed to patch calendar event ${eventId}: ${response.status} ${err}`);
        }
        patched++;
      }

      console.log(`Calendar event(s) updated (${patched}): "${summary}" colorId=${meta.colorId}`);
      return { success: true, updated: patched };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error updating calendar event status:', message);
      return { success: false, updated: 0, error: message };
    }
  }

  /**
   * Builds a Google Calendar event body from a raw DB booking row.
   * Used when creating a brand-new event during a transition (no prior event exists).
   */
  private static bookingFlagTrue(v: unknown): boolean {
    return v === true || v === 'true';
  }

  /**
   * HTML body shown in Google Calendar (matches guest-submit event copy + DB-only fields).
   */
  private static buildGoogleCalendarDescriptionFromDbBooking(
    booking: any,
    nights: number,
  ): string {
    const adminLink = `https://kamehomes.space/bookings/${booking.id}`;
    const needParking = CalendarService.bookingFlagTrue(booking.need_parking);
    const hasPets = CalendarService.bookingFlagTrue(booking.has_pets);
    const decorRequested = CalendarService.bookingFlagTrue(
      booking.guest_requests_surprise_decor,
    );

    return `
<a href="${adminLink}">View Booking in Admin</a>

<strong>Guest Information</strong>
Facebook/Airbnb Name: ${booking.guest_facebook_name ?? ''}
Primary Guest: ${booking.primary_guest_name ?? ''}
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

<strong>Additional Information</strong>
Booking Source: ${booking.booking_source ?? 'Facebook'}
How Found Us: ${booking.find_us ?? ''}${booking.find_us_details ? `\nDetails: ${booking.find_us_details}` : ''}
Surprise decor setup: ${decorRequested ? 'Yes' : 'No'}
Special Requests: ${booking.guest_special_requests || 'None'}

<strong>Documents</strong>
${booking.payment_receipt_url ? `<a href="${booking.payment_receipt_url}">Downpayment receipt</a>` : 'No downpayment receipt'}
${booking.valid_id_url ? `<a href="${booking.valid_id_url}">Valid ID</a>` : 'No valid ID'}
    `.trim();
  }

  private static buildEventDataFromDbRow(
    booking: any,
    status: BookingStatus,
    pax: number,
    nights: number,
    summary: string,
  ) {
    const description = this.buildGoogleCalendarDescriptionFromDbBooking(booking, nights);

    // DB stores MM-DD-YYYY dates; prefer check_out_date so 1-night stays end on checkout day (not check-in day).
    const checkInDateMdy = String(booking.check_in_date ?? '');
    const checkoutRaw = String(booking.check_out_date ?? '').trim();
    const endDateMdy = checkoutRaw
      || dayjs(checkInDateMdy, 'MM-DD-YYYY', true).add(Math.max(1, nights), 'day').format('MM-DD-YYYY');

    return {
      summary,
      description,
      start: {
        dateTime: buildGoogleCalendarDateTime(
          checkInDateMdy,
          booking.check_in_time,
          DEFAULT_CHECK_IN_TIME,
        ),
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: buildGoogleCalendarDateTime(endDateMdy, booking.check_out_time, '23:59'),
        timeZone: 'Asia/Manila',
      },
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

  private static eventMatchesBookingId(
    item: { description?: string; extendedProperties?: { private?: { bookingId?: string } } },
    bookingId: string,
  ): boolean {
    if (item.extendedProperties?.private?.bookingId === bookingId) return true;
    const desc = item.description ?? '';
    return desc.includes(bookingId) || desc.includes(`/bookings/${bookingId}`);
  }

  /** Fallback for legacy events missing extendedProperties (guest name + check-in in body). */
  private static eventMatchesBookingHeuristic(
    item: { summary?: string; description?: string },
    booking?: { guest_facebook_name?: string; check_in_date?: string },
  ): boolean {
    if (!booking) return false;
    const name = String(booking.guest_facebook_name ?? '').trim();
    const checkIn = String(booking.check_in_date ?? '').trim();
    if (!name) return false;
    const summary = item.summary ?? '';
    if (!summary.includes(name)) return false;
    if (!checkIn) return true;
    const desc = item.description ?? '';
    return desc.includes(checkIn) || summary.includes(checkIn);
  }

  private static eventMatchesBooking(
    item: {
      summary?: string;
      description?: string;
      extendedProperties?: { private?: { bookingId?: string } };
    },
    bookingId: string,
    booking?: unknown,
  ): boolean {
    if (this.eventMatchesBookingId(item, bookingId)) return true;
    return this.eventMatchesBookingHeuristic(
      item,
      booking as { guest_facebook_name?: string; check_in_date?: string } | undefined,
    );
  }

  private static async listCalendarEvents(
    calendarId: string,
    accessToken: string,
    params: Record<string, string>,
  ): Promise<Array<{ id?: string; description?: string; extendedProperties?: { private?: { bookingId?: string } } }>> {
    const qs = new URLSearchParams({ maxResults: '25', ...params });
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${qs}`,
      { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.items ?? [];
  }

  private static async findExistingEventId(
    credentials: { calendarId: string },
    accessToken: string,
    bookingId: string,
    booking?: unknown,
  ): Promise<string | null> {
    const ids = await this.collectAllEventIds(credentials, accessToken, bookingId, booking);
    return ids[0] ?? null;
  }

  private static async collectAllEventIds(
    credentials: { calendarId: string },
    accessToken: string,
    bookingId: string,
    booking?: unknown,
  ): Promise<string[]> {
    const calendarId = credentials.calendarId;
    const row = booking as { check_in_date?: string; number_of_nights?: number } | undefined;
    const ids = new Set<string>();

    const addMatches = (
      items: Array<{
        id?: string;
        summary?: string;
        description?: string;
        extendedProperties?: { private?: { bookingId?: string } };
      }>,
    ) => {
      for (const item of items) {
        if (item.id && this.eventMatchesBooking(item, bookingId, booking)) ids.add(item.id);
      }
    };

    for (const params of [
      { privateExtendedProperty: `bookingId=${bookingId}`, singleEvents: 'true', orderBy: 'startTime' },
      { q: bookingId, singleEvents: 'true', orderBy: 'startTime' },
    ]) {
      addMatches(await this.listCalendarEvents(calendarId, accessToken, params));
    }

    const checkInYmd = row?.check_in_date
      ? normalizeDateToYYYYMMDD(String(row.check_in_date))
      : '';
    if (checkInYmd) {
      const nights = Math.max(1, Number(row?.number_of_nights) || 1);
      const timeMin = dayjs(checkInYmd, 'YYYY-MM-DD', true).subtract(1, 'day').startOf('day').toISOString();
      const timeMax = dayjs(checkInYmd, 'YYYY-MM-DD', true).add(nights + 2, 'day').endOf('day').toISOString();
      addMatches(await this.listCalendarEvents(calendarId, accessToken, {
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      }));
    }
    return [...ids];
  }

  /**
   * Creates the event data object for Google Calendar
   */
  private static createEventData(bookingId: string, formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string) {
    const pax = +formData.numberOfAdults + +(formData.numberOfChildren || 0);
    const nights = formData.numberOfNights || 1;

    // Use the PENDING_REVIEW status for initial event creation (Q: the submit-form
    // side effects will move to the orchestrator in Phase 5; for now keep using
    // PENDING_REVIEW color on initial creation).
    const summary = buildCalendarSummary(
      'PENDING_REVIEW',
      pax,
      nights,
      formData.guestFacebookName,
      {
        guest_requests_surprise_decor: formData.guestRequestsSurpriseDecor,
        has_pets: formData.hasPets,
        need_parking: formData.needParking,
      },
    );

    // Admin link
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
Booking Source: ${formData.bookingSource || 'Facebook'}
How Found Us: ${formData.findUs}${formData.findUsDetails ? `\nDetails: ${formData.findUsDetails}` : ''}
Surprise decor setup: ${formData.guestRequestsSurpriseDecor ? 'Yes' : 'No'}
Special Requests: ${formData.guestSpecialRequests || 'None'}

<strong>Documents</strong>
<a href="${paymentReceiptUrl}">Downpayment receipt</a>
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
