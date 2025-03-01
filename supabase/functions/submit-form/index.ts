import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DatabaseService } from '../_shared/databaseService.ts'
import { generatePDF } from '../_shared/pdfService.ts'
import { sendEmail } from '../_shared/emailService.ts'
import { CalendarService } from '../_shared/calendarService.ts'
import { extractRouteParam } from '../_shared/utils.ts'

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
    const isPDFGenerationEnabled = url.searchParams.get('generatePdf') === 'true'
    const isSendEmailEnabled = url.searchParams.get('sendEmail') === 'true'
    const isCalendarUpdateEnabled = url.searchParams.get('updateGoogleCalendar') === 'true'
    
    // Get bookingId from URL path if it exists
    const bookingId = extractRouteParam(url.pathname, '/submit-form/');

    // Get and process form data
    const formData = await req.formData()
    
    // Process form data and save to database
    const { data, submissionData, validIdUrl, paymentReceiptUrl } = await DatabaseService.processFormData(formData, bookingId)

    let pdfBuffer = null
    // Generate PDF if enabled
    if (isPDFGenerationEnabled) {
      pdfBuffer = await generatePDF(data)
    }

    // Send email if enabled
    if (isSendEmailEnabled) {
      await sendEmail(data, pdfBuffer)
    }

    // Create or update calendar event if enabled
    if (isCalendarUpdateEnabled) {
      await CalendarService.createOrUpdateCalendarEvent(data, validIdUrl, paymentReceiptUrl, bookingId)
    }

    console.log('Form submission process completed successfully')

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: submissionData,
        message: bookingId ? 'Form updated successfully.' : 'Form submitted successfully.'
      }),
      {
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in form submission:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to process form submission'
      }),
      {
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
}) 