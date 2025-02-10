import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import * as dotenv from 'dotenv'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

// Supabase confirguration
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Resend configuration
const resendApiKey = process.env.RESEND_API_KEY ?? ''
const resend = new Resend(resendApiKey)

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}))

app.use(express.json({ limit: '10mb' }))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generatePDF(formData: any) {
  try {
    const templatePath = path.join(__dirname, 'templates', 'guest-form-template.pdf')
    
    console.log('Template path:', templatePath)
    console.log('Directory exists:', fs.existsSync(path.dirname(templatePath)))
    console.log('Template exists:', fs.existsSync(templatePath))
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`)
    }

    const templateBytes = fs.readFileSync(templatePath)
    console.log('Template file size:', templateBytes.length, 'bytes')

    const pdfDoc = await PDFDocument.load(templateBytes)
    const form = pdfDoc.getForm()

    // Log all form fields for debugging
    const fields = form.getFields()
    console.log('Form fields found:', fields.length)
    console.log('Available form fields:', fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name
    })))

    // Only proceed with filling if we have fields
    if (fields.length > 0) {
      // Try to fill each field, logging success or failure
      const fieldMappings = {
        // Unit and Owner Information
        'unitOwner': formData.unitOwner,
        'towerAndUnitNumber': formData.towerAndUnitNumber,
        'ownerOnsiteContactPerson': formData.ownerOnsiteContactPerson,
        'ownerContactNumber': formData.ownerContactNumber,
        
        // Primary Guest Information
        'primaryGuestName': formData.primaryGuestName,
        'guestEmail': formData.guestEmail,
        'guestPhoneNumber': formData.guestPhoneNumber,
        'guestAddress': formData.guestAddress,
        'nationality': formData.nationality,
        
        // Check-in/out Information
        'checkInDate': formData.checkInDate,
        'checkOutDate': formData.checkOutDate,
        'checkInTime': formData.checkInTime,
        'checkOutTime': formData.checkOutTime,
        'numberOfNights': formData.numberOfNights,
        
        // Guest Count
        'numberOfAdults': String(formData.numberOfAdults),
        'numberOfChildren': String(formData.numberOfChildren),
        
        // Additional Guests
        'guest2Name': formData.guest2Name,
        'guest3Name': formData.guest3Name,
        'guest4Name': formData.guest4Name,
        'guest5Name': formData.guest5Name,
        
        // Parking Information
        'carPlateNumber': formData.carPlateNumber,
        'carBrandModel': formData.carBrandModel,
        'carColor': formData.carColor,
      }

      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        try {
          const field = form.getTextField(fieldName)
          if (field) {
            console.log(`Successfully found and filling field: ${fieldName}`)
            field.setText(value ? String(value) : '')
          } else {
            console.log(`Field not found in PDF: ${fieldName}`)
          }
        } catch (e) {
          console.log(`Could not set field "${fieldName}":`, e.message)
        }
      }

      // Flatten the form to make it non-editable
      form.flatten()
    } else {
      console.log('Warning: No form fields found in the PDF template')
    }

    return await pdfDoc.save()
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/submit-form', async (req, res) => {
  try {
    console.log('Received form submission request')
    const formData = req.body
    
    if (!formData) {
      console.error('No form data provided')
      return res.status(400).json({ 
        success: false,
        error: 'No form data provided' 
      })
    }

    console.log('Form data received:', formData)

    const requiredFields = ['guestFacebookName', 'primaryGuestName', 'guestEmail', 'guestPhoneNumber', 'guestAddress', 'checkInDate', 'checkOutDate']
    for (const field of requiredFields) {
      if (!formData[field]) {
        console.error(`Missing required field: ${field}`)
        return res.status(400).json({ 
          success: false,
          error: `Missing required field: ${field}` 
        })
      }
    }

    console.log('Inserting data into Supabase...')
    const { data, error: dbError } = await supabase
      .from('guest_submissions')
      .insert([{
        unit_owner: formData.unitOwner,
        tower_and_unit_number: formData.towerAndUnitNumber,
        owner_onsite_contact_person: formData.ownerOnsiteContactPerson,
        guest_facebook_name: formData.guestFacebookName,
        primary_guest_name: formData.primaryGuestName,
        guest_email: formData.guestEmail,
        guest_phone_number: formData.guestPhoneNumber,
        guest_address: formData.guestAddress,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        check_in_time: formData.checkInTime,
        check_out_time: formData.checkOutTime,
        nationality: formData.nationality,
        number_of_adults: formData.numberOfAdults,
        number_of_children: formData.numberOfChildren,
        guest2_name: formData.guest2Name,
        guest3_name: formData.guest3Name,
        guest4_name: formData.guest4Name,
        guest5_name: formData.guest5Name,
        guest_special_requests: formData.guestSpecialRequests,
        find_us: formData.findUs,
        find_us_details: formData.findUsDetails,
        need_parking: formData.needParking,
        car_plate_number: formData.carPlateNumber,
        car_brand_model: formData.carBrandModel,
        car_color: formData.carColor,
        has_pets: formData.hasPets,
        pet_name: formData.petName,
        pet_breed: formData.petBreed,
        pet_age: formData.petAge,
        pet_vaccination_date: formData.petVaccinationDate
      }])
      .select()
      .single()
  
    if (dbError) {
      console.error('Database error:', dbError)
      return res.status(500).json({ 
        success: false,
        error: 'Database error',
        details: dbError.message
      })
    }

    console.log('Successfully saved to database')

    console.log('Generating PDF...')
    const pdfBytes = await generatePDF(formData)
    console.log('PDF generated successfully')

    try {
      console.log('Sending email...')
      const emailResult = await resend.emails.send({
        from: 'Guest Form <onboarding@resend.dev>',
        to: ['michaeldmanlulu@gmail.com'],
        cc: ['kamehome.azurenorth@gmail.com', formData.guestEmail],
        subject: 'New Guest Form Submission',
        html: `
          <h1>Azure North Monaco 2604 - Guest Form</h1>
          <ul>
            <li>Booking Information:
              <ul>
                <li>Tower & Unit No.: Monaco Tower, Unit 2604</li>
                <li>Check-in: ${formData.checkInDate} at ${formData.checkInTime}</li>
                <li>Check-out: ${formData.checkOutDate} at ${formData.checkOutTime}</li>
              </ul>
            </li>
            <li>Guest Information:
              <ul>
                <li>Primary Guest: ${formData.primaryGuestName}</li>
                <li>Nationality: ${formData.nationality}</li>
                <li>Guest Email: ${formData.guestEmail}</li>
                <li>Guest Phone Number: ${formData.guestPhoneNumber}</li>
                <li>Number of Adults: ${formData.numberOfAdults}</li>
                <li>Number of Children: ${formData.numberOfChildren}</li>
                <li>Other Guests:
                  <ul>
                    ${formData.guest2Name ? `<li>${formData.guest2Name}</li>` : ''}
                    ${formData.guest3Name ? `<li>${formData.guest3Name}</li>` : ''}
                    ${formData.guest4Name ? `<li>${formData.guest4Name}</li>` : ''}
                    ${formData.guest5Name ? `<li>${formData.guest5Name}</li>` : ''}
                  </ul>
                </li>
              </ul>
            </li>
            ${formData.needParking ? `
            <li>Car Information:
              <ul>
                <li>Car Plate Number: ${formData.carPlateNumber}</li>
                <li>Car Brand & Model: ${formData.carBrandModel}</li>
                <li>Car Color: ${formData.carColor}</li>
              </ul>
            </li>
            ` : ''}
            ${formData.hasPets ? `
            <li>Pet Information:
              <ul>
                <li>Name: ${formData.petName}</li>
                <li>Breed: ${formData.petBreed}</li>
                <li>Age: ${formData.petAge}</li>
                <li>Last Vaccination: ${formData.petVaccinationDate}</li>
              </ul>
            </li>
            ` : ''}
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
      console.error('Email sending error:', emailError)
    }

    res.json({ 
      success: true, 
      data,
      message: 'Form submitted successfully'
    })
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    })
  }
})

const port = process.env.PORT ?? 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})