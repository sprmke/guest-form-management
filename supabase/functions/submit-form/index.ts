import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DatabaseService } from '../_shared/databaseService.ts'
import { generatePDF } from '../_shared/pdfService.ts'
import { sendEmail } from '../_shared/emailService.ts'
import { CalendarService } from '../_shared/calendarService.ts'
import { SheetsService } from '../_shared/sheetsService.ts'
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
    const isSheetsUpdateEnabled = url.searchParams.get('updateGoogleSheets') === 'true'
    
    // Get and process form data
    const formData = await req.formData()
    
    // Process form data and save to database
    const { data, submissionData, validIdUrl, paymentReceiptUrl, petVaccinationUrl } = await DatabaseService.processFormData(formData)

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
      await CalendarService.createOrUpdateCalendarEvent(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, submissionData.id)
    }

    // Append to Google Sheet if enabled
    if (isSheetsUpdateEnabled) {
      await SheetsService.appendToSheet(data, validIdUrl, paymentReceiptUrl, petVaccinationUrl, submissionData.id)
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