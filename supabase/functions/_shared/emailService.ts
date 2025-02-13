import { GuestFormData } from './types.ts'

export async function sendEmail(formData: GuestFormData, pdfBuffer: Uint8Array) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Guest Form <no-reply@yourdomain.com>',
      to: [formData.guestEmail],
      subject: 'Guest Form Submission Confirmation',
      html: `
        <h1>Thank you for your submission!</h1>
        <p>Dear ${formData.primaryGuestName},</p>
        <p>We have received your guest form submission. Here are the details:</p>
        <ul>
          <li>Check-in Date: ${formData.checkInDate}</li>
          <li>Check-out Date: ${formData.checkOutDate}</li>
          <li>Number of Guests: ${+(formData?.numberOfAdults ?? 0) + +(formData?.numberOfChildren ?? 0) || 'Not specified'}</li>
        </ul>
        <p>Please find your submission details in the attached PDF.</p>
        <p>Best regards,<br>Your Host</p>
      `,
      attachments: [
        {
          filename: 'guest-form-submission.pdf',
          content: btoa(String.fromCharCode(...pdfBuffer))
        }
      ]
    })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`)
  }

  return await res.json()
} 