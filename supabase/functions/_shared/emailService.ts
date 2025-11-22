import { GuestFormData } from './types.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Checks if a booking is urgent (same-day check-in)
 * @param checkInDate - Check-in date in MM-DD-YYYY or YYYY-MM-DD format
 * @returns true if check-in is today (in Philippine timezone UTC+8)
 */
function isUrgentBooking(checkInDate: string): boolean {
  try {
    console.log('🔍 Checking if booking is urgent...');
    
    // Parse the check-in date (supports both MM-DD-YYYY and YYYY-MM-DD formats)
    let checkInDateStr = checkInDate;
    
    // If date is in MM-DD-YYYY format, convert to YYYY-MM-DD
    if (checkInDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [month, day, year] = checkInDate.split('-');
      checkInDateStr = `${year}-${month}-${day}`;
      console.log('  Converted to YYYY-MM-DD:', checkInDateStr);
    }
    
    // Get today's date in Philippine timezone (UTC+8)
    const philippineTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const todayStr = philippineTime.getFullYear() + '-' + 
      String(philippineTime.getMonth() + 1).padStart(2, '0') + '-' + 
      String(philippineTime.getDate()).padStart(2, '0');
    
    console.log('  Today\'s date (Philippine time):', todayStr);
    console.log('  Check-in date (normalized):', checkInDateStr);
    console.log('  Is urgent:', checkInDateStr === todayStr);
    
    return checkInDateStr === todayStr;
  } catch (error) {
    console.error('❌ Error checking if booking is urgent:', error);
    return false;
  }
}

export async function sendEmail(formData: GuestFormData, pdfBuffer: Uint8Array | null, isTestingMode = false) {
  console.log('Sending confirmation email...');
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_TO = Deno.env.get('EMAIL_TO')
  const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO')
  
  if (!RESEND_API_KEY) {
    console.error(' Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!EMAIL_TO) {
    console.error(' Missing EMAIL_TO environment variable');
    throw new Error('Missing EMAIL_TO environment variable')
  }

  if (!EMAIL_REPLY_TO) {
    console.error(' Missing EMAIL_REPLY_TO environment variable');
    throw new Error('Missing EMAIL_REPLY_TO environment variable')
  }

  // Check if booking is urgent (same-day check-in)
  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = isUrgent ? '🚨 URGENT - ' : '';

  if (isUrgent) {
    console.log('🚨 URGENT BOOKING DETECTED - Same-day check-in!');
  }

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? `
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
      <strong>⚠️ TEST EMAIL:</strong> This is a test booking submission. Please disregard this email as it is for testing purposes only.
    </div>
  ` : '';

  const emailContent = `
    ${testWarning}
    <h3>Monaco 2604 - GAF Request (${formData.checkInDate} to ${formData.checkOutDate})</h3>
    <br>
    ${isUrgent ? '<p style="color: #dc3545; text-transform: uppercase;"><strong>🚨 This is a same-day check-in and requires immediate attention and approval.</strong></p>' : ''}
    <br>
    <p>Good day,</p>
    <p>Kindly review the Guest Advice Form Request for ${formData.towerAndUnitNumber}, dated from ${formData.checkInDate} to ${formData.checkOutDate}, for your approval.</p>
    <p>Let me know if you need any further information.</p>
    <p>Thank you.</p>
    <br>
    <p>Best regards,</p>
    <p>Arianna Perez</p>
    <p>Unit Owner, Monaco 2604</p>
  `

  // Convert Uint8Array to base64 string efficiently
  let base64PDF: string | null = null;
  if (pdfBuffer) {
    // Use TextEncoder to convert the buffer to base64 in chunks
    const chunks: string[] = [];
    const chunkSize = 32768; // Process 32KB chunks
    
    for (let i = 0; i < pdfBuffer.length; i += chunkSize) {
      const chunk = pdfBuffer.slice(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, chunk));
    }
    
    base64PDF = btoa(chunks.join(''));
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - GAF Request <mail@kamehomes.space>',
      to: [EMAIL_TO],
      cc: [formData.guestEmail, EMAIL_REPLY_TO],
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}${urgentPrefix}Monaco 2604 - GAF Request (${formData.checkInDate} to ${formData.checkOutDate})`,
      html: emailContent,
      ...(base64PDF ? {
        attachments: [{
          filename: `MONACO_2604_GAF-${formData.checkInDate}.pdf`,
          content: base64PDF,
          encoding: 'base64'
        }]
      } : {})
    })
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`)
  }

  console.log('Email sent successfully');
  return await res.json()
}

export async function sendPetEmail(
  formData: GuestFormData, 
  pdfBuffer: Uint8Array | null,
  petImageUrl?: string,
  petVaccinationUrl?: string
) {
  console.log('Sending pet request email...');
  console.log('Pet Image URL:', petImageUrl);
  console.log('Pet Vaccination URL:', petVaccinationUrl);
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_TO = Deno.env.get('EMAIL_TO')
  const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO')
  
  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!EMAIL_TO) {
    console.error('Missing EMAIL_TO environment variable');
    throw new Error('Missing EMAIL_TO environment variable')
  }

  if (!EMAIL_REPLY_TO) {
    console.error('Missing EMAIL_REPLY_TO environment variable');
    throw new Error('Missing EMAIL_REPLY_TO environment variable')
  }

  // Test mode email warning
  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? `
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
      <strong>⚠️ TEST EMAIL:</strong> This is a test booking submission. Please disregard this email as it is for testing purposes only.
    </div>
  ` : '';

  // Check if booking is urgent (same-day check-in)
  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = isUrgent ? '🚨 URGENT - ' : '';

  if (isUrgent) {
    console.log('🚨 URGENT PET BOOKING DETECTED - Same-day check-in!');
  }

  const emailContent = `
    ${testWarning}
    <h3>Monaco 2604 - Pet Request (${formData.checkInDate} to ${formData.checkOutDate})</h3>
    <br>
    ${isUrgent ? '<p style="color: #dc3545; text-transform: uppercase;"><strong>🚨 This is a same-day check-in and requires immediate attention and approval.</strong></p>' : ''}
    <br>
    <p>Good day,</p>
    <p>We are writing to request approval for our guest on bringing a pet to <strong>${formData.towerAndUnitNumber}</strong> during their stay from <strong>${formData.checkInDate}</strong> to <strong>${formData.checkOutDate}</strong>.</p>
    <br>
    <p><strong>Pet Details:</strong></p>
    <ul>
      <li><strong>Pet Name:</strong> ${formData.petName || 'N/A'}</li>
      <li><strong>Pet Type:</strong> ${formData.petType || 'N/A'}</li>
      <li><strong>Pet Breed:</strong> ${formData.petBreed || 'N/A'}</li>
      <li><strong>Pet Age:</strong> ${formData.petAge || 'N/A'}</li>
      <li><strong>Vaccination Date:</strong> ${formData.petVaccinationDate || 'N/A'}</li>
    </ul>
    <br>
    <p>Attached to this email are:</p>
    <ul>
      <li>Completed Pet Form with all required information</li>
      <li>Pet vaccination records</li>
      <li>Pet photograph</li>
    </ul>
    <br>
    <br>
    <p>Please let us know if you need any additional information or documentation.</p>
    <br>
    <p>Thank you for your consideration.</p>
    <br>
    <p>Best regards,</p>
    <p>Arianna Perez</p>
    <p>Unit Owner, Monaco 2604</p>
  `

  // Prepare attachments array
  const attachments: any[] = []

  // Add Pet PDF if available
  if (pdfBuffer) {
    const chunks: string[] = [];
    const chunkSize = 32768;
    
    for (let i = 0; i < pdfBuffer.length; i += chunkSize) {
      const chunk = pdfBuffer.slice(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, chunk));
    }
    
    const base64PDF = btoa(chunks.join(''));
    attachments.push({
      filename: `MONACO_2604_PET_FORM-${formData.checkInDate}.pdf`,
      content: base64PDF,
      encoding: 'base64'
    })
  }

  // Initialize Supabase client for downloading files
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Helper function to extract bucket and path from Supabase URL
  const parseSupabaseUrl = (url: string): { bucket: string; path: string } | null => {
    try {
      // Skip placeholder values from dev/testing mode
      if (url === 'dev-mode-skipped' || url === 'test-mode-skipped' || !url.startsWith('http')) {
        console.log('  Skipping placeholder URL:', url);
        return null;
      }
      
      // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && publicIndex < pathParts.length - 2) {
        const bucket = pathParts[publicIndex + 1];
        const path = pathParts.slice(publicIndex + 2).join('/');
        return { bucket, path };
      }
      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  // Download and attach pet image if URL is provided
  if (petImageUrl && petImageUrl !== 'dev-mode-skipped' && petImageUrl !== 'test-mode-skipped') {
    try {
      console.log('Downloading pet image from:', petImageUrl);
      const urlInfo = parseSupabaseUrl(petImageUrl);
      
      if (urlInfo) {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(urlInfo.bucket)
          .download(urlInfo.path);

        if (downloadError) {
          console.error('Error downloading pet image from storage:', downloadError);
        } else if (fileData) {
          const imageArray = new Uint8Array(await fileData.arrayBuffer());
          
          const chunks: string[] = [];
          const chunkSize = 32768;
          
          for (let i = 0; i < imageArray.length; i += chunkSize) {
            const chunk = imageArray.slice(i, i + chunkSize);
            chunks.push(String.fromCharCode.apply(null, chunk));
          }
          
          const base64Image = btoa(chunks.join(''));
          
          // Extract filename from path
          const filename = urlInfo.path.split('/').pop() || `pet-image-${formData.checkInDate}.jpg`;
          
          attachments.push({
            filename: filename,
            content: base64Image,
            encoding: 'base64'
          })
          console.log('Pet image attached successfully:', filename);
        }
      } else {
        console.warn('Could not parse pet image URL');
      }
    } catch (error) {
      console.error('Error downloading pet image:', error);
    }
  }

  // Download and attach pet vaccination if URL is provided
  if (petVaccinationUrl && petVaccinationUrl !== 'dev-mode-skipped' && petVaccinationUrl !== 'test-mode-skipped') {
    try {
      console.log('Downloading pet vaccination record from:', petVaccinationUrl);
      const urlInfo = parseSupabaseUrl(petVaccinationUrl);
      
      if (urlInfo) {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(urlInfo.bucket)
          .download(urlInfo.path);

        if (downloadError) {
          console.error('Error downloading pet vaccination from storage:', downloadError);
        } else if (fileData) {
          const vaccinationArray = new Uint8Array(await fileData.arrayBuffer());
          
          const chunks: string[] = [];
          const chunkSize = 32768;
          
          for (let i = 0; i < vaccinationArray.length; i += chunkSize) {
            const chunk = vaccinationArray.slice(i, i + chunkSize);
            chunks.push(String.fromCharCode.apply(null, chunk));
          }
          
          const base64Vaccination = btoa(chunks.join(''));
          
          // Extract filename from path
          const filename = urlInfo.path.split('/').pop() || `pet-vaccination-${formData.checkInDate}.jpg`;
          
          attachments.push({
            filename: filename,
            content: base64Vaccination,
            encoding: 'base64'
          })
          console.log('Pet vaccination record attached successfully:', filename);
        }
      } else {
        console.warn('Could not parse pet vaccination URL');
      }
    } catch (error) {
      console.error('Error downloading pet vaccination record:', error);
    }
  }

  console.log(`Sending pet email with ${attachments.length} attachment(s)...`);
  attachments.forEach((att, index) => {
    console.log(`  Attachment ${index + 1}: ${att.filename} (${att.content.length} chars base64)`);
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Pet Request <mail@kamehomes.space>',
      to: [EMAIL_TO],
      cc: [formData.guestEmail, EMAIL_REPLY_TO],
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}${urgentPrefix}Monaco 2604 - Pet Request (${formData.checkInDate} to ${formData.checkOutDate})`,
      html: emailContent,
      attachments: attachments
    })
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('Failed to send pet email:', error);
    throw new Error(`Failed to send pet email: ${JSON.stringify(error)}`)
  }

  console.log('Pet email sent successfully');
  return await res.json()
} 