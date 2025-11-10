import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all bookings with check-in and check-out dates
    const { data: bookings, error } = await supabase
      .from('guest_submissions')
      .select('id, check_in_date, check_out_date')
      .order('check_in_date', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch bookings');
    }

    // Normalize dates to YYYY-MM-DD format
    const normalizeDate = (dateStr: string): string => {
      // Check if date is in YYYY-MM-DD format (already normalized)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Check if date is in MM-DD-YYYY format
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('-');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Return as-is if format is unknown
      return dateStr;
    };

    // Transform bookings to normalized date ranges
    const bookedDateRanges = bookings?.map(booking => ({
      id: booking.id,
      checkInDate: normalizeDate(booking.check_in_date),
      checkOutDate: normalizeDate(booking.check_out_date)
    })) || [];

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: bookedDateRanges,
        message: 'Booked dates retrieved successfully.'
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
    console.error('Error getting booked dates:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to retrieve booked dates'
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


