import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Service to delete a Google Calendar event by booking ID
class CalendarCancellationService {
  static async deleteEventByBookingId(bookingId: string) {
    try {
      console.log('🗓️ Deleting Google Calendar event for booking:', bookingId);
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      
      if (!serviceAccount || !calendarId) {
        console.log('⚠️ Google Calendar credentials not found, skipping calendar deletion');
        return { success: true, deleted: 0, skipped: true };
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
        return { success: true, deleted: 0, message: 'No calendar event found' };
      }

      let deletedCount = 0;
      for (const event of events) {
        try {
          await this.deleteEvent(credentials, accessToken, event.id);
          deletedCount++;
          console.log(`✓ Deleted calendar event: "${event.summary}" (ID: ${event.id})`);
        } catch (error) {
          console.error(`✗ Failed to delete calendar event "${event.summary}":`, error.message);
        }
      }

      console.log(`✅ Calendar deletion complete: ${deletedCount} event(s) deleted`);
      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { success: false, error: error.message, deleted: 0 };
    }
  }

  private static async deleteEvent(credentials: any, accessToken: string, eventId: string) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(credentials.calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const errorText = await response.text();
      throw new Error(`Failed to delete event (${response.status}): ${errorText}`);
    }
    
    return true;
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

// Service to delete a Google Sheets row by booking ID
class SheetsCancellationService {
  static async deleteRowByBookingId(bookingId: string) {
    try {
      console.log('📊 Deleting Google Sheets row for booking:', bookingId);
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
      
      if (!serviceAccount || !spreadsheetId) {
        console.log('⚠️ Google Sheets credentials not found, skipping sheets deletion');
        return { success: true, deleted: 0, skipped: true };
      }

      const credentials = {
        serviceAccount: JSON.parse(serviceAccount),
        spreadsheetId
      };

      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      
      // Get all data from the sheet
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:AJ`,
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
        return { success: true, deleted: 0, message: 'No sheet row found' };
      }

      // Delete the row
      const deleteResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${credentials.spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: 0, // Assuming first sheet
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // API uses 0-based index
                  endIndex: rowIndex
                }
              }
            }]
          }),
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(`Failed to delete row: ${JSON.stringify(error)}`);
      }

      console.log(`✅ Deleted sheet row ${rowIndex} for booking:`, bookingId);
      return { success: true, deleted: 1 };
    } catch (error) {
      console.error('Error deleting sheet row:', error);
      return { success: false, error: error.message, deleted: 0 };
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

// Service to delete storage files for a booking
class StorageCancellationService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async deleteBookingFiles(booking: any) {
    const results: Record<string, any> = {};
    
    // Extract file names from URLs
    const urlsToDelete = [
      { bucket: 'payment-receipts', url: booking.payment_receipt_url },
      { bucket: 'valid-ids', url: booking.valid_id_url },
      { bucket: 'pet-vaccinations', url: booking.pet_vaccination_url },
      { bucket: 'pet-images', url: booking.pet_image_url },
    ];

    for (const { bucket, url } of urlsToDelete) {
      if (!url || url === 'dev-mode-skipped') {
        results[bucket] = { success: true, deleted: 0, skipped: true };
        continue;
      }

      try {
        // Extract file name from URL
        const fileName = this.extractFileName(url);
        if (!fileName) {
          console.log(`⚠️ Could not extract file name from URL for ${bucket}:`, url);
          results[bucket] = { success: true, deleted: 0, message: 'No file name found' };
          continue;
        }

        console.log(`🗑️ Deleting ${bucket}/${fileName}...`);

        const { error: deleteError } = await this.supabase
          .storage
          .from(bucket)
          .remove([fileName]);

        if (deleteError) {
          console.error(`✗ Failed to delete ${bucket}/${fileName}:`, deleteError);
          results[bucket] = { success: false, error: deleteError.message, deleted: 0 };
        } else {
          console.log(`✓ Deleted ${bucket}/${fileName}`);
          results[bucket] = { success: true, deleted: 1 };
        }
      } catch (error) {
        console.error(`Error deleting from ${bucket}:`, error);
        results[bucket] = { success: false, error: error.message, deleted: 0 };
      }
    }

    return results;
  }

  private static extractFileName(url: string): string | null {
    try {
      // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/filename
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch {
      return null;
    }
  }
}

// Service to delete database record
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

  static async deleteBooking(bookingId: string) {
    try {
      console.log('🗑️ Deleting database record for booking:', bookingId);
      
      const { error } = await this.supabase
        .from('guest_submissions')
        .delete()
        .eq('id', bookingId);

      if (error) {
        console.error('✗ Failed to delete database record:', error);
        return { success: false, error: error.message, deleted: 0 };
      }

      console.log('✅ Database record deleted for booking:', bookingId);
      return { success: true, deleted: 1 };
    } catch (error) {
      console.error('Error deleting database record:', error);
      return { success: false, error: error.message, deleted: 0 };
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
          message: 'This operation will delete all data associated with this booking.'
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

    console.log('📋 Found booking:', booking.primary_guest_name, '- Proceeding with cancellation...');

    // Perform deletion operations
    const results = {
      storage: await StorageCancellationService.deleteBookingFiles(booking),
      calendar: await CalendarCancellationService.deleteEventByBookingId(bookingId),
      sheets: await SheetsCancellationService.deleteRowByBookingId(bookingId),
      database: await DatabaseCancellationService.deleteBooking(bookingId),
    };

    // Calculate totals
    const totalDeleted = {
      storage: Object.values(results.storage).reduce((sum: number, r: any) => sum + (r.deleted || 0), 0),
      calendar: results.calendar.deleted || 0,
      sheets: results.sheets.deleted || 0,
      database: results.database.deleted || 0,
    };

    console.log('✅ Booking cancellation completed');
    console.log('Summary:', totalDeleted);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking cancelled successfully',
        bookingId,
        guestName: booking.primary_guest_name,
        results,
        summary: {
          totalDeleted,
          grandTotal: Object.values(totalDeleted).reduce((a, b) => a + b, 0)
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

