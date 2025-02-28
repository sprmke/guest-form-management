import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { DatabaseService } from '../_shared/databaseService.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Get bookingId from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    // The path will be like /functions/v1/get-form/{bookingId}
    const bookingId = pathParts[pathParts.length - 1]

    if (!bookingId) {
      throw new Error('bookingId is required')
    }

    // Get form data from database
    const formData = await DatabaseService.getFormData(bookingId)

    if (!formData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Booking not found',
          message: 'No booking found with the provided ID'
        }),
        {
          headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json',
          },
          status: 404,
        }
      )
    }

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: formData,
        message: 'Form data retrieved successfully.'
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
    console.error('Error getting form data:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to retrieve form data'
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