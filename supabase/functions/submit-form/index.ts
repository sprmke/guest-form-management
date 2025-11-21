import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DatabaseService } from '../_shared/databaseService.ts'
import { generatePDF, generatePetPDF } from '../_shared/pdfService.ts'
import { sendEmail, sendPetEmail } from '../_shared/emailService.ts'
import { CalendarService } from '../_shared/calendarService.ts'
import { SheetsService } from '../_shared/sheetsService.ts'
import { extractRouteParam, compareFormData } from '../_shared/utils.ts'

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
    const isPDFGenerationEnabled = url.searchParams.get('generatePdf') === 'true'
    const isSendEmailEnabled = url.searchParams.get('sendEmail') === 'true'
    const isCalendarUpdateEnabled = url.searchParams.get('updateGoogleCalendar') === 'true'
    const isSheetsUpdateEnabled = url.searchParams.get('updateGoogleSheets') === 'true'
    const isTestingMode = url.searchParams.get('testing') === 'true'
    
    // Log enabled features for debugging
    console.log('🎛️ API Action Flags:');
    console.log(`  Save to Database: ${isSaveToDatabaseEnabled ? '✅' : '❌'}`);
    console.log(`  Save Images to Storage: ${isSaveImagesToStorageEnabled ? '✅' : '❌'}`);
    console.log(`  Generate PDF: ${isPDFGenerationEnabled ? '✅' : '❌'}`);
    console.log(`  Send Email: ${isSendEmailEnabled ? '✅' : '❌'}`);
    console.log(`  Update Calendar: ${isCalendarUpdateEnabled ? '✅' : '❌'}`);
    console.log(`  Update Google Sheets: ${isSheetsUpdateEnabled ? '✅' : '❌'}`);
    console.log(`  Testing Mode: ${isTestingMode ? '🧪 ENABLED' : '❌'}`);
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
    
    if (isSaveToDatabaseEnabled && bookingId) {
      console.log('🔍 Checking for data changes...');
      
      // Fetch existing booking raw data (in database format)
      existingData = await DatabaseService.getRawData(bookingId);
      
      if (existingData) {
        // Compare new form data with existing data
        const comparison = compareFormData(formData, existingData);
        hasDataChanges = comparison.hasChanges;
        
        if (!hasDataChanges) {
          console.log('ℹ️ No changes detected, skipping processing and redirecting to success page');
          
          // Return success without processing
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
        
        console.log(`✅ Changes detected (${comparison.changedFields.length} fields), proceeding with update...`);
        console.log('Changed fields:', comparison.changedFields);
      }
    } else if (!isSaveToDatabaseEnabled) {
      console.log('⚠️ Skipping change detection check (saveToDatabase=false)');
    }
    
    // Process form data and save to database
    const { data, submissionData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl } = await DatabaseService.processFormData(formData, isSaveToDatabaseEnabled, isSaveImagesToStorageEnabled, isTestingMode)

    let pdfBuffer = null
    // Generate PDF if enabled
    if (isPDFGenerationEnabled) {
      pdfBuffer = await generatePDF(data, isTestingMode)
    }

    // Send email if enabled
    if (isSendEmailEnabled) {
      await sendEmail(data, pdfBuffer, isTestingMode)
    }

    // Generate Pet PDF and send Pet email if guest has pets
    const hasPets = data.hasPets === true || data.hasPets === 'true'
    if (hasPets && data.petName && data.petType && data.petBreed && data.petAge && data.petVaccinationDate) {
      console.log('🐾 Guest has pets, generating Pet PDF and sending Pet email...')
      
      let petPdfBuffer = null
      
      // Generate Pet PDF if enabled
      if (isPDFGenerationEnabled) {
        try {
          petPdfBuffer = await generatePetPDF(data)
          console.log('Pet PDF generated successfully')
        } catch (error) {
          console.error('Error generating Pet PDF:', error)
          // Don't throw error, continue with email
        }
      }

      // Send Pet email if enabled
      if (isSendEmailEnabled) {
        try {
          await sendPetEmail(data, petPdfBuffer, petImageUrl, petVaccinationUrl)
          console.log('Pet email sent successfully')
        } catch (error) {
          console.error('Error sending Pet email:', error)
          // Don't throw error, continue with processing
        }
      }
    } else if (hasPets) {
      console.log('⚠️ Guest has pets but some pet information is missing, skipping Pet PDF and email')
    }

    // Create or update calendar event if enabled
    if (isCalendarUpdateEnabled) {
      await CalendarService.createOrUpdateCalendarEvent(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, submissionData.id, isTestingMode)
    }

    // Append to Google Sheet if enabled
    if (isSheetsUpdateEnabled) {
      await SheetsService.appendToSheet(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl, submissionData.id, isTestingMode)
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