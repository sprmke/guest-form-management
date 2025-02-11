import { Resend } from 'resend';
import { config } from '../config';
import type { GuestFormData } from '../types/guestForm';

export class EmailService {
  private static resend = new Resend(config.resend.apiKey);

  private static generateEmailContent(formData: GuestFormData): string {
    return `
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
    `;
  }

  static async sendGuestFormEmail(formData: GuestFormData, pdfBuffer: Buffer): Promise<void> {
    try {
      await this.resend.emails.send({
        from: config.email.from,
        to: [...config.email.adminEmails],
        cc: [formData.guestEmail],
        subject: 'New Guest Form Submission',
        html: this.generateEmailContent(formData),
        attachments: [
          {
            filename: 'guest-form.pdf',
            content: pdfBuffer
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email notification');
    }
  }
} 