import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DatabaseService } from '../_shared/databaseService.ts'
import { CalendarService } from '../_shared/calendarService.ts'
import { SheetsService } from '../_shared/sheetsService.ts'
import { sendNewBookingRequestNotify } from '../_shared/emailService.ts'
import { compareFormData, shouldRevertReadyForCheckinToPendingReview } from '../_shared/utils.ts'
import { shouldRevertGuestFieldEditsToPendingReview } from '../_shared/statusMachine.ts'
import type { GuestSubmission } from '../_shared/types.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    console.log('Starting form submission process...')
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Get URL parameters
    const url = new URL(req.url)
    const isSaveToDatabaseEnabled = url.searchParams.get('saveToDatabase') !== 'false' // Default to true for backward compatibility
    const isSaveImagesToStorageEnabled = url.searchParams.get('saveImagesToStorage') !== 'false' // Default to true for backward compatibility
    const isCalendarUpdateEnabled = url.searchParams.get('updateGoogleCalendar') === 'true'
    const isSheetsUpdateEnabled = url.searchParams.get('updateGoogleSheets') === 'true'
    /** New Booking Request → `EMAIL_REPLY_TO`; guest form dev panel sends explicit `sendEmail=false` when unchecked. */
    const isSendEmailEnabled = url.searchParams.get('sendEmail') !== 'false'

    // Check if we're in production (Supabase Edge Functions have DENO_DEPLOYMENT_ID)
    const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined
    
    // Log enabled features for debugging
    console.log('🎛️ API Action Flags:');
    console.log(`  Environment: ${isProduction ? '🌐 PRODUCTION' : '💻 DEVELOPMENT'}`);
    console.log(`  Save to Database: ${isSaveToDatabaseEnabled ? '✅' : '❌'}`);
    console.log(`  Save Images to Storage: ${isSaveImagesToStorageEnabled ? '✅' : '❌'}`);
    console.log('  Generate PDF: ❌ (filled GAF/pet PDFs run on admin PENDING_REVIEW → documents transition)');
    console.log('  Send workflow emails: ❌ (GAF / ack / pet / parking only on admin transitions)');
    console.log(
      `  New Booking Request email (EMAIL_REPLY_TO): ${isSendEmailEnabled ? '✅' : '❌'} (query sendEmail, default on — only sent after a DB save with an id; not this flag alone)`,
    );
    console.log(`  Update Calendar: ${isCalendarUpdateEnabled ? '✅' : '❌'}`);
    console.log(`  Update Google Sheets: ${isSheetsUpdateEnabled ? '✅' : '❌'}`);
    console.log('---');
    
    // Get and process form data
    const formData = await req.formData()
    
    // Extract check-in and check-out dates and booking ID to check for overlaps
    const checkInDate = formData.get('checkInDate') as string;
    const checkOutDate = formData.get('checkOutDate') as string;
    let bookingId = formData.get('bookingId') as string;
    
    // Sanitize bookingId to remove any query parameters or extra characters
    // This prevents UUID validation errors if the bookingId was contaminated
    if (bookingId) {
      bookingId = bookingId.split('?')[0].split('&')[0].trim();
    }

    console.log('📅 Received dates for overlap check:');
    console.log('  Check-in:', checkInDate);
    console.log('  Check-out:', checkOutDate);
    console.log('  Booking ID:', bookingId);

    if (!checkInDate || !checkOutDate) {
      throw new Error('Check-in and check-out dates are required');
    }

    // Check for overlapping bookings (only if saving to database)
    if (isSaveToDatabaseEnabled) {
      console.log('🔍 Starting overlap check...');
      const { hasOverlap, overlappingBookings } = await DatabaseService.checkOverlappingBookings(
        checkInDate, 
        checkOutDate, 
        bookingId
      );

      if (hasOverlap) {
        console.error('❌ BOOKING OVERLAP DETECTED!');
        console.error('Overlapping bookings:', overlappingBookings);
        throw new Error('BOOKING_OVERLAP: The selected dates are already booked. Please screenshot this message and contact your host to further assist you.');
      }
      
      console.log('✅ No overlaps found, proceeding with submission...');
    } else {
      console.log('⚠️ Skipping overlap check (saveToDatabase=false)');
    }
    
    // Check if this is an update and compare data for changes (only if saving to database)
    let hasDataChanges = true;
    let existingData = null;
    let revertReadyForCheckinToPendingReview = false;

    if (isSaveToDatabaseEnabled && bookingId) {
      console.log('🔍 Checking for data changes...');

      existingData = await DatabaseService.getRawData(bookingId);

      if (existingData) {
        const comparison = compareFormData(formData, existingData);
        hasDataChanges = comparison.hasChanges;

        if (!hasDataChanges) {
          console.log('ℹ️ No changes detected, skipping processing and redirecting to success page');
          if (isSendEmailEnabled) {
            console.log(
              '[submit-form] New booking request notify skipped: no data changes (same booking update)',
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: 'No changes detected',
              data: { id: bookingId },
              skipped: true
            }),
            {
              headers: {
                ...corsHeaders(req),
                'Content-Type': 'application/json'
              }
            }
          );
        }

        revertReadyForCheckinToPendingReview =
          shouldRevertGuestFieldEditsToPendingReview(existingData.status) &&
          shouldRevertReadyForCheckinToPendingReview(comparison.changedFields);

        console.log(`✅ Changes detected (${comparison.changedFields.length} fields), proceeding with update...`);
        console.log('Changed fields:', comparison.changedFields);
        if (revertReadyForCheckinToPendingReview) {
          console.log(
            `↩️ ${existingData.status} + workflow-sensitive edits → status will revert to PENDING_REVIEW`,
          );
        }
      }
    } else if (!isSaveToDatabaseEnabled) {
      console.log('⚠️ Skipping change detection check (saveToDatabase=false)');
    }

    const { data, submissionData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl } =
      await DatabaseService.processFormData(
        formData,
        isSaveToDatabaseEnabled,
        isSaveImagesToStorageEnabled,
        revertReadyForCheckinToPendingReview,
      );

    // Workflow emails (GAF, acknowledgement, pet, parking) are only sent by
    // WorkflowOrchestrator on admin transitions. Optional **New Booking Request**
    // notify (`sendEmail` query; default on) — non-fatal if it fails.

    if (isSendEmailEnabled && isSaveToDatabaseEnabled && submissionData?.id) {
      try {
        const notifyResult = await sendNewBookingRequestNotify(submissionData as GuestSubmission);
        console.log(
          '[submit-form] New booking request notify ok, Resend id:',
          (notifyResult as { id?: string })?.id ?? JSON.stringify(notifyResult),
        );
      } catch (notifyErr) {
        console.error('[submit-form] New booking request notify failed (non-fatal):', notifyErr);
      }
    } else if (isSendEmailEnabled) {
      const reasons: string[] = [];
      if (!isSaveToDatabaseEnabled) reasons.push('saveToDatabase=false');
      if (!submissionData?.id) reasons.push('no submission id after save');
      console.log(`[submit-form] New booking request notify skipped: ${reasons.join(', ')}`);
    }

    // Create or update calendar event if enabled
    if (isCalendarUpdateEnabled) {
      await CalendarService.createOrUpdateCalendarEvent(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, submissionData.id)
    }

    // Append to Google Sheet if enabled
    if (isSheetsUpdateEnabled) {
      await SheetsService.appendToSheet(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, submissionData.id)
    }

    console.log('Form submission process completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data: submissionData
      }),
      {
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error processing form submission:', error)
    
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
    )
  }
}) 