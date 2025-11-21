import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Service to clean up Google Calendar test events
class CalendarCleanupService {
  static async deleteTestEvents() {
    try {
      console.log('🗑️ Cleaning up Google Calendar test events...');
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      
      if (!serviceAccount || !calendarId) {
        console.log('⚠️ Google Calendar credentials not found, skipping calendar cleanup');
        return { success: true, deleted: 0, skipped: true };
      }

      const credentials = {
        serviceAccount: JSON.parse(serviceAccount),
        calendarId
      };

      const accessToken = await this.getAccessToken(credentials.serviceAccount);
      
      // Get all events (including future events)
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${oneYearAgo.toISOString()}&` +
        `maxResults=2500&` +
        `singleEvents=true`,
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
        throw new Error(`Failed to fetch calendar events: ${response.status}`);
      }

      const data = await response.json();
      const events = data.items || [];
      
      console.log(`📊 Fetched ${events.length} total events from calendar`);
      
      // Filter events that start with [TEST]
      const testEvents = events.filter((event: any) => {
        const hasTestPrefix = event.summary && event.summary.startsWith('[TEST]');
        if (hasTestPrefix) {
          console.log(`  Found test event: "${event.summary}" (ID: ${event.id})`);
        }
        return hasTestPrefix;
      });

      console.log(`🎯 Found ${testEvents.length} test events to delete`);

      if (testEvents.length === 0) {
        console.log('✅ No test events found to delete');
        return { success: true, deleted: 0 };
      }

      let deletedCount = 0;
      let failedCount = 0;
      
      for (const event of testEvents) {
        try {
          await this.deleteEvent(credentials, accessToken, event.id);
          deletedCount++;
          console.log(`✓ Deleted: "${event.summary}"`);
        } catch (error) {
          failedCount++;
          console.error(`✗ Failed to delete "${event.summary}":`, error.message);
        }
      }

      console.log(`✅ Calendar cleanup complete: ${deletedCount} deleted, ${failedCount} failed`);
      return { 
        success: true, 
        deleted: deletedCount,
        failed: failedCount 
      };
    } catch (error) {
      console.error('Error cleaning up calendar:', error);
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
    
    // 404 means already deleted, 410 means already gone - both are fine
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

// Service to clean up Google Sheets test rows
class SheetsCleanupService {
  static async deleteTestRows() {
    try {
      console.log('🗑️ Cleaning up Google Sheets test rows...');
      
      const serviceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
      
      if (!serviceAccount || !spreadsheetId) {
        console.log('⚠️ Google Sheets credentials not found, skipping sheets cleanup');
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
      
      // Find rows with [TEST] prefix in Facebook Name column (column B, index 1)
      const rowsToDelete: number[] = [];
      for (let i = 1; i < values.length; i++) { // Skip header row
        const row = values[i];
        if (row && row[1] && row[1].startsWith('[TEST]')) {
          rowsToDelete.push(i + 1); // +1 because Sheets API is 1-indexed
        }
      }

      console.log(`Found ${rowsToDelete.length} test rows to delete`);

      // Delete rows in reverse order to maintain row indices
      let deletedCount = 0;
      for (const rowIndex of rowsToDelete.reverse()) {
        try {
          await this.deleteRow(credentials, accessToken, rowIndex);
          deletedCount++;
          console.log(`✓ Deleted sheet row: ${rowIndex}`);
        } catch (error) {
          console.error(`✗ Failed to delete row ${rowIndex}:`, error);
        }
      }

      console.log(`✅ Sheets cleanup complete: ${deletedCount} rows deleted`);
      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error cleaning up sheets:', error);
      return { success: false, error: error.message, deleted: 0 };
    }
  }

  private static async deleteRow(credentials: any, accessToken: string, rowIndex: number) {
    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete row: ${JSON.stringify(error)}`);
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

// Service to clean up Supabase Storage test files
class StorageCleanupService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async deleteTestFiles() {
    const buckets = ['payment-receipts', 'valid-ids', 'pet-vaccinations', 'pet-images'];
    const results: Record<string, any> = {};

    for (const bucket of buckets) {
      try {
        console.log(`🗑️ Cleaning up ${bucket} bucket...`);
        
        const { data: files, error: listError } = await this.supabase
          .storage
          .from(bucket)
          .list('', {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError) {
          console.error(`Error listing files in ${bucket}:`, listError);
          results[bucket] = { success: false, error: listError.message, deleted: 0 };
          continue;
        }

        // Filter files that start with TEST_
        const testFiles = files?.filter(file => file.name.startsWith('TEST_')) || [];
        console.log(`Found ${testFiles.length} test files in ${bucket}`);

        let deletedCount = 0;
        for (const file of testFiles) {
          try {
            const { error: deleteError } = await this.supabase
              .storage
              .from(bucket)
              .remove([file.name]);

            if (deleteError) {
              console.error(`✗ Failed to delete ${file.name}:`, deleteError);
            } else {
              deletedCount++;
              console.log(`✓ Deleted ${bucket}/${file.name}`);
            }
          } catch (error) {
            console.error(`✗ Error deleting ${file.name}:`, error);
          }
        }

        results[bucket] = { success: true, deleted: deletedCount, total: testFiles.length };
        console.log(`✅ ${bucket} cleanup complete: ${deletedCount} files deleted`);
      } catch (error) {
        console.error(`Error cleaning up ${bucket}:`, error);
        results[bucket] = { success: false, error: error.message, deleted: 0 };
      }
    }

    return results;
  }
}

// Service to clean up Database test records
class DatabaseCleanupService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async deleteTestRecords() {
    try {
      console.log('🗑️ Cleaning up database test records...');
      
      // Find all records where file URLs contain TEST_
      const { data: records, error: fetchError } = await this.supabase
        .from('guest_submissions')
        .select('id, guest_facebook_name, payment_receipt_url, valid_id_url, pet_vaccination_url, pet_image_url')
        .or('payment_receipt_url.like.%TEST_%,valid_id_url.like.%TEST_%,pet_vaccination_url.like.%TEST_%,pet_image_url.like.%TEST_%');

      if (fetchError) {
        console.error('Error fetching test records:', fetchError);
        return { success: false, error: fetchError.message, deleted: 0 };
      }

      console.log(`Found ${records?.length || 0} test records to delete`);

      let deletedCount = 0;
      for (const record of records || []) {
        try {
          const { error: deleteError } = await this.supabase
            .from('guest_submissions')
            .delete()
            .eq('id', record.id);

          if (deleteError) {
            console.error(`✗ Failed to delete record ${record.id}:`, deleteError);
          } else {
            deletedCount++;
            console.log(`✓ Deleted database record: ${record.guest_facebook_name} (${record.id})`);
          }
        } catch (error) {
          console.error(`✗ Error deleting record ${record.id}:`, error);
        }
      }

      console.log(`✅ Database cleanup complete: ${deletedCount} records deleted`);
      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error cleaning up database:', error);
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
    console.log('🧹 Starting test data cleanup...');
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Parse request body to check for confirmation
    const body = await req.json().catch(() => ({}));
    
    if (body.confirm !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cleanup requires confirmation. Send { "confirm": true } in request body.',
          message: 'This operation will delete all test data from database, storage, calendar, and sheets.'
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

    // Perform cleanup operations
    const results = {
      database: await DatabaseCleanupService.deleteTestRecords(),
      storage: await StorageCleanupService.deleteTestFiles(),
      calendar: await CalendarCleanupService.deleteTestEvents(),
      sheets: await SheetsCleanupService.deleteTestRows(),
    };

    // Calculate totals
    const totalDeleted = {
      database: results.database.deleted || 0,
      storage: Object.values(results.storage).reduce((sum: number, r: any) => sum + (r.deleted || 0), 0),
      calendar: results.calendar.deleted || 0,
      sheets: results.sheets.deleted || 0,
    };

    console.log('✅ Test data cleanup completed successfully');
    console.log('Summary:', totalDeleted);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data cleanup completed',
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
    console.error('Error during cleanup:', error);
    
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

