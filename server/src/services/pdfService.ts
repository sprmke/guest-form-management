import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import type { GuestFormData } from '../types/guestForm';

export class PDFService {
  private static readonly templatePath = path.join(config.paths.templates, 'guest-form-template.pdf');

  private static validateTemplate(): void {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template file not found at: ${this.templatePath}`);
    }
  }

  static async generatePDF(formData: GuestFormData): Promise<Buffer> {
    try {
      this.validateTemplate();
      
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

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
      };

      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(value ? String(value) : '');
          }
        } catch (error) {
          console.warn(`Could not set field "${fieldName}":`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      form.flatten();
      return Buffer.from(await pdfDoc.save());
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }
} 