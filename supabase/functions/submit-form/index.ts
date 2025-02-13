import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { transformFormDataToSnakeCase } from '../_shared/utils.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    // Get the form data
    const formData = await req.formData()
    console.log('Received form data:', Object.fromEntries(formData.entries()))
    
    let paymentReceiptUrl: string | null = null
    let paymentReceiptFileName: string | null = null

    // Handle file upload first if present
    const paymentReceipt = formData.get('paymentReceipt') as File
    if (paymentReceipt) {
      const fileExt = paymentReceipt.name.split('.').pop()
      const tempFileName = `${Date.now()}-payment-receipt.${fileExt}`
      
      const { error: uploadError } = await supabaseClient
        .storage
        .from('payment-receipts')
        .upload(tempFileName, paymentReceipt)

      if (uploadError) throw uploadError

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('payment-receipts')
        .getPublicUrl(tempFileName)

      paymentReceiptUrl = publicUrl
      paymentReceiptFileName = tempFileName
    }

    // Convert form data to an object and transform to snake case
    const formDataObj: Record<string, any> = {}
    formData.forEach((value, key) => {
      if (key !== 'paymentReceipt') { // Skip the file field
        formDataObj[key] = value
      }
    })

    // Transform the data and add the file information
    const data = {
      ...transformFormDataToSnakeCase(formDataObj),
      payment_receipt_url: paymentReceiptUrl,
      payment_receipt_file_name: paymentReceiptFileName
    }

    console.log('Processed data for database:', data)

    // Insert the form submission into the database
    const { data: submissionData, error } = await supabaseClient
      .from('guest_submissions')
      .insert([data])
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Return the response with CORS headers
    return new Response(
      JSON.stringify({ success: true, data: submissionData }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
}) 