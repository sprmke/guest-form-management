import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GuestFormData } from './types.ts'

async function getTemplateBytes(): Promise<Uint8Array> {
  console.log('Fetching PDF template from Supabase Storage...');
  
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
}

export async function generatePDF(formData: GuestFormData): Promise<Uint8Array> {
  try {
    console.log('Generating PDF...');
    const templateBytes = await getTemplateBytes()
    const pdfDoc = await PDFDocument.load(templateBytes)
    const form = pdfDoc.getForm()

    const fieldMappings: Record<string, string | undefined> = {
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
      'numberOfNights': String(formData.numberOfNights),
      
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
          field.setText(value ? String(value) : '')
        }
      } catch (error) {
        console.warn(`⚠️ Could not set field "${fieldName}":`, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    form.flatten()
    const pdfBytes = await pdfDoc.save()
    console.log('PDF generated successfully')
    return pdfBytes
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
} 