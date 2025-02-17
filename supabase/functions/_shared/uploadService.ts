import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export class UploadService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async uploadPaymentReceipt(file: File): Promise<{ url: string; fileName: string }> {
    try {
      // Generate a unique file name
      const fileName = `payment_receipt_${Date.now()}_${file.name}`;
      const { url } = await this.uploadFile(file, fileName, 'payment-receipts');
      return { url, fileName };
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      throw new Error('Failed to upload payment receipt');
    }
  }

  static async uploadValidId(file: File): Promise<{ url: string; fileName: string }> {
    try {
      // Generate a unique file name
      const fileName = `valid_id_${Date.now()}_${file.name}`;
      const { url } = await this.uploadFile(file, fileName, 'valid-ids');
      return { url, fileName };
    } catch (error) {
      console.error('Error uploading valid ID:', error);
      throw new Error('Failed to upload valid ID');
    }
  }

  static async uploadFile(file: File, fileName: string, bucket: string): Promise<{ url: string }> {
    console.log(`Processing ${bucket} upload...`);
    
    const { error: uploadError } = await this.supabase
      .storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      console.error(`${bucket} upload error:`, uploadError);
      throw new Error(`Failed to upload file to ${bucket}`);
    }

    const { data: { publicUrl } } = this.supabase
      .storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log(`${bucket} uploaded successfully`);
    return { url: publicUrl };
  }
} 