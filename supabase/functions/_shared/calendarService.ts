import { GuestFormData } from './types.ts';

export class CalendarService {
  static async createCalendarEvent(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string) {
    try {
      console.log('Creating calendar event...');
      
      const credentials = await this.getCredentials();
      const eventData = this.createEventData(formData, validIdUrl, paymentReceiptUrl);
      
      console.log('Calendar event data:', eventData);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
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
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Formats a date and time string to ISO 8601 format
   */
  private static formatDateTime(date: string, time: string): string {
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
   * Creates the event data object for Google Calendar
   */
  private static createEventData(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string) {
    const eventSummary = `${+formData.numberOfAdults + +(formData.numberOfChildren ?? 0)}pax ${formData.numberOfNights}night${formData.numberOfNights > 1 ? 's' : ''} - ${formData.primaryGuestName}`;
    const eventDescription = `
<strong>Guest Information</strong>
Facebook Name: ${formData.guestFacebookName}
Primary Guest: ${formData.primaryGuestName}
Email: ${formData.guestEmail}
Phone Number: ${formData.guestPhoneNumber}
Address: ${formData.guestAddress}
Nationality: ${formData.nationality}
${formData.guest2Name || formData.guest3Name || formData.guest4Name || formData.guest5Name ? `<strong>Additional Guests</strong>\n` : ''}${formData.guest2Name ? `Guest 2: ${formData.guest2Name}\n` : ''}${formData.guest3Name ? `Guest 3: ${formData.guest3Name}\n` : ''}${formData.guest4Name ? `Guest 4: ${formData.guest4Name}\n` : ''}${formData.guest5Name ? `Guest 5: ${formData.guest5Name}\n` : ''}
<strong>Stay Details</strong>
Check-in Date: ${formData.checkInDate} ${formData.checkInTime}
Check-out Date: ${formData.checkOutDate} ${formData.checkOutTime}
Number of Nights: ${formData.numberOfNights || 'N/A'}
Number of Adults: ${formData.numberOfAdults}
Number of Children: ${formData.numberOfChildren}

<strong>Parking Information</strong>
${formData.needParking ? `Parking Required: Yes
Car Plate: ${formData.carPlateNumber || 'N/A'}
Car Brand/Model: ${formData.carBrandModel || 'N/A'}
Car Color: ${formData.carColor || 'N/A'}` : 'Parking Required: No'}

<strong>Pet Information</strong>
${formData.hasPets ? `Has Pets: Yes
Pet Name: ${formData.petName || 'N/A'}
Pet Breed: ${formData.petBreed || 'N/A'}
Pet Age: ${formData.petAge || 'N/A'}
Vaccination Date: ${formData.petVaccinationDate || 'N/A'}` : 'Has Pets: No'}

<strong>Additional Information</strong>
How Found Us: ${formData.findUs}${formData.findUsDetails ? `\nDetails: ${formData.findUsDetails}` : ''}
Special Requests: ${formData.guestSpecialRequests || 'None'}

<strong>Documents</strong>
Payment Receipt: ${paymentReceiptUrl}
Valid ID: ${validIdUrl}
    `.trim();

    const checkInDateTime = this.formatDateTime(formData.checkInDate, formData.checkInTime);
    const checkOutDateTime = this.formatDateTime(formData.checkOutDate, formData.checkOutTime);

    return {
      summary: eventSummary,
      description: eventDescription,
      start: {
        dateTime: checkInDateTime,
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: checkOutDateTime,
        timeZone: 'Asia/Manila',
      },
      colorId: '2',
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
   * Gets and validates required credentials
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
