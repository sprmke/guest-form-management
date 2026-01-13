import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Service to update Google Calendar event to show as canceled
class CalendarCancellationService {
  static async markEventAsCanceled(bookingId: string, originalSummary: string) {
    try {
      console.log('🗓️ Marking Google Calendar event as canceled for booking:', bookingId);
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      
      if (!serviceAccount || !calendarId) {
        console.log('⚠️ Google Calendar credentials not found, skipping calendar update');
        return { success: true, updated: 0, skipped: true };
      }

      const credentials = {
        serviceAccount: JSON.parse(serviceAccount),
        calendarId
      };

      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      
      // Find event by bookingId in extended properties
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?privateExtendedProperty=bookingId=${bookingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Calendar API error:', errorText);
        throw new Error(`Failed to search for calendar event: ${response.status}`);
      }

      const data = await response.json();
      const events = data.items || [];
      
      if (events.length === 0) {
        console.log('✅ No calendar event found for booking:', bookingId);
        return { success: true, updated: 0, message: 'No calendar event found' };
      }

      let updatedCount = 0;
      for (const event of events) {
        try {
          // Update the event with [CANCELED] prefix and red color
          const currentSummary = event.summary || '';
          // Remove any existing [CANCELED] prefix to avoid duplicates
          const cleanSummary = currentSummary.replace(/^\[CANCELED\]\s*/i, '');
          const newSummary = `[CANCELED] ${cleanSummary}`;
          
          await this.updateEvent(credentials, accessToken, event.id, {
            summary: newSummary,
            colorId: '11', // Tomato (Red) color
          });
          updatedCount++;
          console.log(`✓ Updated calendar event: "${event.summary}" → "${newSummary}" (Red color)`);
        } catch (error) {
          console.error(`✗ Failed to update calendar event "${event.summary}":`, error.message);
        }
      }

      console.log(`✅ Calendar update complete: ${updatedCount} event(s) marked as canceled`);
      return { success: true, updated: updatedCount };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return { success: false, error: error.message, updated: 0 };
    }
  }

  private static async updateEvent(credentials: any, accessToken: string, eventId: string, updates: { summary: string; colorId: string }) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update event (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }

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
    
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/-----BEGIN PRIVATE KEY-----\n/, '')
      .replace(/\n-----END PRIVATE KEY-----/, '')
      .trim();

    const binaryDer = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

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

// Service to update Google Sheets row status to "Canceled"
class SheetsCancellationService {
  // Status column is AK (column 37, index 36 in 0-based)
  private static STATUS_COLUMN = 'AK';
  private static STATUS_COLUMN_INDEX = 36;

  static async markRowAsCanceled(bookingId: string) {
    try {
      console.log('📊 Marking Google Sheets row as canceled for booking:', bookingId);
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
      
      if (!serviceAccount || !spreadsheetId) {
        console.log('⚠️ Google Sheets credentials not found, skipping sheets update');
        return { success: true, updated: 0, skipped: true };
      }

      const credentials = {
        serviceAccount: JSON.parse(serviceAccount),
        spreadsheetId
      };

      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      
      // Get all data from the sheet to find the row
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:AK`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sheet data');
      }

      const data = await response.json();
      const values = data.values || [];
      
      // Find the row with matching bookingId (in the first column)
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) { // Skip header row
        if (values[i] && values[i][0] === bookingId) {
          rowIndex = i + 1; // Sheets API is 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        console.log('✅ No sheet row found for booking:', bookingId);
        return { success: true, updated: 0, message: 'No sheet row found' };
      }

      // Update the status column (AK) to "Canceled"
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}/values/${this.STATUS_COLUMN}${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [['Canceled']]
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(`Failed to update row status: ${JSON.stringify(error)}`);
      }

      console.log(`✅ Updated sheet row ${rowIndex} status to "Canceled" for booking:`, bookingId);
      return { success: true, updated: 1 };
    } catch (error) {
      console.error('Error updating sheet row:', error);
      return { success: false, error: error.message, updated: 0 };
    }
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
    
    const privateKey = credentials.private_key
      .replace(/\\n/g, '\n')
      .replace(/-----BEGIN PRIVATE KEY-----\n/, '')
      .replace(/\n-----END PRIVATE KEY-----/, '')
      .trim();

    const binaryDer = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

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

// Service to update database record status
class DatabaseCancellationService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async getBooking(bookingId: string) {
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  }

  static async markBookingAsCanceled(bookingId: string) {
    try {
      console.log('🗑️ Marking booking as canceled in database:', bookingId);
      
      const { data, error } = await this.supabase
        .from('guest_submissions')
        .update({ status: 'canceled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('✗ Failed to update database record:', error);
        return { success: false, error: error.message, updated: 0 };
      }

      console.log('✅ Database record marked as canceled for booking:', bookingId);
      return { success: true, updated: 1, data };
    } catch (error) {
      console.error('Error updating database record:', error);
      return { success: false, error: error.message, updated: 0 };
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    console.log('🚫 Starting booking cancellation...');
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { bookingId, confirm } = body;

    if (!bookingId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking ID is required'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (confirm !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cancellation requires confirmation. Send { "confirm": true } in request body.',
          message: 'This operation will mark the booking as canceled and free up the dates.'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get booking data first
    const booking = await DatabaseCancellationService.getBooking(bookingId);
    
    if (!booking) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking not found',
          bookingId
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Check if already canceled
    if (booking.status === 'canceled') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking is already canceled',
          bookingId
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('📋 Found booking:', booking.primary_guest_name, '- Proceeding with cancellation...');

    // Perform cancellation operations (update instead of delete)
    const results = {
      database: await DatabaseCancellationService.markBookingAsCanceled(bookingId),
      calendar: await CalendarCancellationService.markEventAsCanceled(bookingId, booking.primary_guest_name),
      sheets: await SheetsCancellationService.markRowAsCanceled(bookingId),
    };

    // Calculate totals
    const totalUpdated = {
      database: results.database.updated || 0,
      calendar: results.calendar.updated || 0,
      sheets: results.sheets.updated || 0,
    };

    console.log('✅ Booking cancellation completed');
    console.log('Summary:', totalUpdated);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking canceled successfully. All data preserved, dates are now available for new bookings.',
        bookingId,
        guestName: booking.primary_guest_name,
        results,
        summary: {
          totalUpdated,
          grandTotal: Object.values(totalUpdated).reduce((a, b) => a + b, 0)
        }
      }),
      {
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error during booking cancellation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
