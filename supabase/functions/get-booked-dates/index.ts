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

    // Get today's date
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get all active bookings from database (exclude canceled ones)
    // Note: Dates are stored as TEXT in MM-DD-YYYY format
    // We'll filter in JavaScript since PostgREST doesn't support TO_DATE in simple filters
    const { data: bookings, error } = await supabase
      .from('guest_submissions')
      .select('id, check_in_date, check_out_date, status')
      .or('status.is.null,status.eq.booked'); // Include bookings without status (legacy) or with status 'booked'

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch bookings');
    }

    // Helper to parse MM-DD-YYYY date string to Date object
    const parseMMDDYYYY = (dateStr: string): Date | null => {
      try {
        const [month, day, year] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } catch {
        return null;
      }
    };

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

    // Set today to start of day for fair comparison (00:00:00)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Filter out past bookings (where check_out_date < today)
    // Then transform bookings to normalized date ranges
    const bookedDateRanges = bookings
      ?.filter(booking => {
        const checkOutDate = parseMMDDYYYY(booking.check_out_date);
        if (!checkOutDate) {
          console.warn(`Invalid date format for booking ${booking.id}: ${booking.check_out_date}`);
          return false; // Exclude bookings with invalid dates
        }
        // Keep only bookings where check-out date is today or in the future
        return checkOutDate >= todayStart;
      })
      .map(booking => ({
        id: booking.id,
        checkInDate: normalizeDate(booking.check_in_date),
        checkOutDate: normalizeDate(booking.check_out_date)
      })) || [];

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: bookedDateRanges,
        message: 'Future booked dates retrieved successfully.'
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


