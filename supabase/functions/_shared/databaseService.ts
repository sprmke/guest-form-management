import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { GuestFormData, transformFormToSubmission } from './types.ts'
import { UploadService } from './uploadService.ts'

export class DatabaseService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async processFormData(formData: FormData): Promise<{ data: GuestFormData; submissionData: any }> {
    try {
      console.log('Processing form data...');

      // Handle file upload if present
      const paymentReceipt = formData.get('paymentReceipt') as File;
      if (!paymentReceipt) {
        throw new Error('Payment receipt is required');
      }
      
      const {
        url: paymentReceiptUrl,
        fileName: paymentReceiptFileName
      } = await UploadService.uploadPaymentReceipt(paymentReceipt);

      // Convert form data to an object
      const formDataObj: Partial<GuestFormData> = {};
      formData.forEach((value, key) => {
        if (key !== 'paymentReceipt') { // Skip the file field
          formDataObj[key] = value;
        }
      });

      // Create the final data object with file information
      const data = {
        ...(formDataObj as GuestFormData)
      };

      console.log('Form data processed successfully');
      
      // Transform and save to database
      if (!paymentReceiptUrl || !paymentReceiptFileName) {
        throw new Error('Failed to upload payment receipt');
      }
      
      const dbData = transformFormToSubmission(data, paymentReceiptUrl, paymentReceiptFileName);
      const submissionData = await this.saveGuestSubmission(dbData);

      return { data, submissionData };
    } catch (error) {
      console.error('Error processing form data:', error);
      throw new Error('Failed to process form data: ' + error.message);
    }
  }

  private static async saveGuestSubmission(formData: any) {
    console.log('Saving submission to database...');
    
    const { data, error } = await this.supabase
      .from('guest_submissions')
      .insert([formData])
      .select();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save guest submission');
    }

    console.log('Database submission successful');
    return data;
  }
} 