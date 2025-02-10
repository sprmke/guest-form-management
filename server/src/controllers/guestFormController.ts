import type { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/emailService';
import type { GuestFormData } from '../types/guestForm';

export class GuestFormController {
  private static validateFormData(formData: any): formData is GuestFormData {
    const requiredFields = [
      'guestFacebookName',
      'primaryGuestName',
      'guestEmail',
      'guestPhoneNumber',
      'guestAddress',
      'checkInDate',
      'checkOutDate'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return true;
  }

  static async submitForm(req: Request, res: Response) {
    try {
      console.log('Received form submission request');
      const formData = req.body;

      if (!formData) {
        return res.status(400).json({
          success: false,
          error: 'No form data provided'
        });
      }

      // Validate form data
      try {
        GuestFormController.validateFormData(formData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Invalid form data'
        });
      }

      // Save to database
      console.log('Saving to database...');
      const savedData = await DatabaseService.saveGuestSubmission(formData);

      // Generate PDF
      console.log('Generating PDF...');
      const pdfBuffer = await PDFService.generatePDF(formData);

      // Send email
      console.log('Sending email...');
      await EmailService.sendGuestFormEmail(formData, pdfBuffer);

      res.json({
        success: true,
        data: savedData,
        message: 'Form submitted successfully'
      });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  }
} 