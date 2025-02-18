import { GuestFormData } from './types.ts'

export async function sendEmail(formData: GuestFormData, pdfBuffer: Uint8Array | null) {
  console.log('Sending confirmation email...');
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    console.error(' Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  const emailContent = `
    <h3>Monaco 2604 - GAF Request (${formData.checkInDate})</h3>
    <p>Good day,</p>
    <p>Please find attached Guest Advice Form request for ${formData.checkInDate}, for ${formData.towerAndUnitNumber}, for your approval.</p>
    <p>Let me know if you need any further information.</p>
    <p>Thank you.</p>
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
      from: 'Monaco 2604 - GAF Request - <onboarding@resend.dev>',
      to: ['kamehome.azurenorth@gmail.com'],
      subject: `Monaco 2604 - GAF Request (${formData.checkInDate})`,
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