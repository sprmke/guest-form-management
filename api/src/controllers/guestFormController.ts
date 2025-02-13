import type { Request, Response } from 'express-serve-static-core';
import { DatabaseService } from '../services/databaseService';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/emailService';
import type { GuestFormData } from '../types/guestForm';
import multer from 'multer';

interface TypedRequestBody<T> extends Request {
  body: T;
  file?: Express.Multer.File;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  },
}).single('paymentReceipt');

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

  static async submitForm(req: TypedRequestBody<GuestFormData>, res: Response) {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: 'File upload error',
          details: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type',
          details: err.message
        });
      }

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

        // Handle payment receipt upload if file exists
        if (req.file) {
          try {
            const fileUrl = await DatabaseService.uploadPaymentReceipt(
              req.file.buffer,
              req.file.originalname
            );
            formData.paymentReceiptUrl = fileUrl;
            formData.paymentReceiptFileName = req.file.originalname;
          } catch (error) {
            return res.status(500).json({
              success: false,
              error: 'Failed to upload payment receipt',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }
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
    });
  }
} 