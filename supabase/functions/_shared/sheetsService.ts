import dayjs from 'https://esm.sh/dayjs@1.11.10'
import { GuestFormData } from './types.ts';

export class SheetsService {
  static async appendToSheet(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId: string) {
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
        const values = this.formatDataForSheet(formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, bookingId, existingRow.createdAt);
        // Update existing row
        await this.updateRow(credentials, existingRow.rowIndex, values);
        console.log('Updated existing row in Google Sheet');
        return;
      }

      // If row not found, append new row
      const values = this.formatDataForSheet(formData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, bookingId);

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
      // Get all values from the sheet
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/A:AI`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken(credentials.serviceAccount)}`,
          },
        }
      );

      if (!response.ok) {
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
      `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/A${rowIndex}:AI${rowIndex}?valueInputOption=USER_ENTERED`,
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

  private static formatDataForSheet(formData: GuestFormData, validIdUrl: string, paymentReceiptUrl: string, petVaccinationUrl: string, petImageUrl: string, bookingId: string, createdAt?: string): string[] {
    const currentTimestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    return [
      bookingId,                          // Booking ID
      formData.guestFacebookName,         // Facebook Name
      formData.primaryGuestName,          // Primary Guest Name
      formData.guestEmail,                // Email
      formData.guestPhoneNumber,          // Phone Number
      formData.guestAddress,              // Address
      formData.nationality,               // Nationality
      formData.checkInDate,               // Check-in Date
      formData.checkInTime,               // Check-in Time
      formData.checkOutDate,              // Check-out Date
      formData.checkOutTime,              // Check-out Time
      formData.numberOfNights?.toString() || '', // Number of Nights
      formData.numberOfAdults.toString(), // Number of Adults
      formData.numberOfChildren.toString(), // Number of Children
      formData.guest2Name || '',          // Guest 2 Name
      formData.guest3Name || '',          // Guest 3 Name
      formData.guest4Name || '',          // Guest 4 Name
      formData.guest5Name || '',          // Guest 5 Name
      formData.needParking === 'true' ? 'Yes' : 'No', // Need Parking
      formData.carPlateNumber || '',      // Car Plate Number
      formData.carBrandModel || '',       // Car Brand/Model
      formData.carColor || '',            // Car Color
      formData.hasPets === 'true' ? 'Yes' : 'No',    // Has Pets
      formData.petName || '',             // Pet Name
      formData.petBreed || '',            // Pet Breed
      formData.petAge || '',              // Pet Age
      formData.petVaccinationDate || '',  // Pet Vaccination Date
      formData.findUs,                    // How Found Us
      formData.findUsDetails || '',       // Find Us Details
      formData.guestSpecialRequests || '', // Special Requests
      validIdUrl,                          // Valid ID URL
      paymentReceiptUrl,                   // Payment Receipt URL
      petVaccinationUrl,                   // Pet Vaccination URL
      petImageUrl,                         // Pet Image URL
      createdAt || currentTimestamp,       // Created At (use provided value or current timestamp)
      currentTimestamp,                    // Updated At (always current timestamp)
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