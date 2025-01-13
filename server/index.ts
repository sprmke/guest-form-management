import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Debug log for Resend API key
console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY)

const resendApiKey = process.env.RESEND_API_KEY
if (!resendApiKey) {
  throw new Error('Missing Resend API key')
}
const resend = new Resend(resendApiKey)

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}))

app.use(express.json())

async function generatePDF(formData: any) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()
  const { height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let yOffset = height - 50
  const lineHeight = 25

  const addLine = (text: string) => {
    page.drawText(text, {
      x: 50,
      y: yOffset,
      size: 12,
      font,
    })
    yOffset -= lineHeight
  }

  addLine(`Guest Information Form`)
  addLine(`Facebook Name: ${formData.facebook_name}`)
  addLine(`Full Name: ${formData.full_name}`)
  addLine(`Email: ${formData.email}`)
  addLine(`Contact Number: ${formData.contact_number}`)
  addLine(`Address: ${formData.address}`)
  addLine(`Check-in/Check-out: ${formData.check_in_out}`)
  
  if (formData.other_guests?.length) {
    addLine(`Other Guests: ${formData.other_guests.join(', ')}`)
  }
  
  if (formData.requests) {
    addLine(`Requests: ${formData.requests}`)
  }
  
  addLine(`Found Through: ${formData.find_us}`)
  addLine(`Needs Parking: ${formData.need_parking ? 'Yes' : 'No'}`)
  addLine(`Has Pets: ${formData.has_pets ? 'Yes' : 'No'}`)

  return await pdfDoc.save()
}

app.post('/api/submit-form', async (req, res) => {
  try {
    const formData = req.body
    console.log('Received form data:', formData)

    if (!formData) {
      return res.status(400).json({ 
        success: false,
        error: 'No form data provided' 
      })
    }

    // Validate required fields
    const requiredFields = ['facebook_name', 'full_name', 'email', 'contact_number', 'address', 'check_in_out', 'find_us']
    for (const field of requiredFields) {
      if (!formData[field]) {
        return res.status(400).json({ 
          success: false,
          error: `Missing required field: ${field}` 
        })
      }
    }

    // Insert data into Supabase
    const { data, error: dbError } = await supabase
      .from('guest_submissions')
      .insert([{
        facebook_name: formData.facebook_name,
        full_name: formData.full_name,
        email: formData.email,
        contact_number: formData.contact_number,
        address: formData.address,
        check_in_out: formData.check_in_out,
        other_guests: formData.other_guests || [],
        requests: formData.requests || '',
        find_us: formData.find_us,
        need_parking: formData.need_parking || false,
        has_pets: formData.has_pets || false
      }])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return res.status(500).json({ 
        success: false,
        error: 'Database error',
        message: dbError.message
      })
    }

    console.log('Successfully saved to database')

    // Generate PDF
    const pdfBytes = await generatePDF(formData)
    console.log('PDF generated successfully')

    // Send email using Resend
    try {
      console.log('Attempting to send email...')
      const emailResult = await resend.emails.send({
        from: 'Guest Form <onboarding@resend.dev>',
        to: ['michaeldmanlulu@gmail.com', formData.email],
        subject: 'New Guest Form Submission',
        html: `
          <h1>New Guest Form Submission</h1>
          <p>A new guest form has been submitted with the following details:</p>
          <ul>
            <li>Name: ${formData.full_name}</li>
            <li>Email: ${formData.email}</li>
            <li>Check-in/out: ${formData.check_in_out}</li>
          </ul>
          <p>Please find the complete details in the attached PDF.</p>
        `,
        attachments: [
          {
            filename: 'guest-form.pdf',
            content: Buffer.from(pdfBytes)
          }
        ]
      })

      console.log('Email sent successfully:', emailResult)
    } catch (emailError) {
      console.error('Resend error:', emailError)
      // Don't return error response, just log it
      console.error('Failed to send email:', emailError instanceof Error ? emailError.message : 'Unknown error')
    }

    res.json({ 
      success: true, 
      data,
      message: 'Form submitted successfully'
    })
  } catch (error) {
    console.error('Error processing form:', error)
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})