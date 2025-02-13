import { GuestFormData } from './types.ts'

export async function sendEmail(formData: GuestFormData, pdfBuffer: Uint8Array | null) {
  console.log('Sending confirmation email...');
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    console.error(' Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  const emailContent = `
    <h1>New Guest Form Submission</h1>
    <p>Dear Admin,</p>
    <p>A new guest form has been submitted. Here are the details:</p>
    <ul>
      <li>Unit Information:
        <ul>
          <li>Unit Owner: ${formData.unitOwner}</li>
          <li>Tower & Unit Number: ${formData.towerAndUnitNumber}</li>
          <li>Onsite Contact Person: ${formData.ownerOnsiteContactPerson}</li>
          <li>Contact Number: ${formData.ownerContactNumber}</li>
        </ul>
      </li>
      <li>Primary Guest:
        <ul>
          <li>Name: ${formData.primaryGuestName}</li>
          <li>Email: ${formData.guestEmail}</li>
          <li>Phone: ${formData.guestPhoneNumber}</li>
          <li>Address: ${formData.guestAddress}</li>
          <li>Nationality: ${formData.nationality || 'Not specified'}</li>
        </ul>
      </li>
      <li>Stay Details:
        <ul>
          <li>Check-in: ${formData.checkInDate} ${formData.checkInTime || ''}</li>
          <li>Check-out: ${formData.checkOutDate} ${formData.checkOutTime || ''}</li>
          <li>Number of Nights: ${formData.numberOfNights || 'Not specified'}</li>
          <li>Number of Adults: ${formData.numberOfAdults || 'Not specified'}</li>
          <li>Number of Children: ${formData.numberOfChildren || 'Not specified'}</li>
        </ul>
      </li>
      <li>Additional Guests:
        <ul>
          ${formData.guest2Name ? `<li>${formData.guest2Name}</li>` : ''}
          ${formData.guest3Name ? `<li>${formData.guest3Name}</li>` : ''}
          ${formData.guest4Name ? `<li>${formData.guest4Name}</li>` : ''}
          ${formData.guest5Name ? `<li>${formData.guest5Name}</li>` : ''}
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
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Guest Form <onboarding@resend.dev>',
      to: ['michaeldmanlulu@gmail.com', 'kamehome.azurenorth@gmail.com'],
      subject: 'Guest Form Submission Confirmation',
      html: emailContent,
      ...(pdfBuffer ? { attachments: [{ filename: 'guest-form-submission.pdf', content: pdfBuffer }] } : {})
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