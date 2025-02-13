import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GuestFormData } from './types.ts'
import { join, fromFileUrl, dirname } from "https://deno.land/std@0.168.0/path/mod.ts"

async function getTemplateBytes(): Promise<Uint8Array> {
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production'
  
  if (isProduction) {
    // In production, fetch from Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: templateData, error: downloadError } = await supabase
      .storage
      .from('templates')
      .download('guest-form-template.pdf')

    if (downloadError) {
      console.error('Error downloading template:', downloadError)
      throw new Error('Failed to download PDF template')
    }

    return new Uint8Array(await templateData.arrayBuffer())
  } else {
    // In development, read directly from local file
    try {
      // Get the current module's directory
      const currentDir = dirname(fromFileUrl(import.meta.url))
      console.log('Current directory:', currentDir)
      
      // Look for template in the _shared/templates directory
      const templatePath = join(currentDir, 'templates', 'guest-form-template.pdf')
      console.log('Attempting to read template from:', templatePath)
      
      const fileBytes = await Deno.readFile(templatePath)
      console.log('Successfully read template file, size:', fileBytes.length)
      return fileBytes
    } catch (error) {
      console.error('Error reading local template:', error)
      throw new Error('Failed to read local PDF template: ' + error.message)
    }
  }
}

export async function generatePDF(formData: GuestFormData): Promise<Uint8Array> {
  // Get template bytes (either from local file or storage)
  const templateBytes = await getTemplateBytes()
  
  // Load the template
  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()

  // Fill form fields
  const fields = {
    'facebook_name': formData.guestFacebookName,
    'guest_name': formData.primaryGuestName,
    'email': formData.guestEmail,
    'phone': formData.guestPhoneNumber,
    'address': formData.guestAddress,
    'check_in': formData.checkInDate,
    'check_out': formData.checkOutDate,
    'special_requests': formData.guestSpecialRequests || '',
    'found_through': formData.findUs || '',
    'need_parking': formData.needParking ? 'Yes' : 'No',
    'has_pets': formData.hasPets ? 'Yes' : 'No',
    'pet_vaccination': formData.petVaccinationDate || ''
  }

  // Fill each field in the form
  for (const [key, value] of Object.entries(fields)) {
    try {
      const field = form.getTextField(key)
      if (field) {
        field.setText(value.toString())
      }
    } catch (error) {
      console.warn(`Field ${key} not found in template`)
    }
  }

  // Flatten the form to prevent further editing
  form.flatten()

  return await pdfDoc.save()
} 