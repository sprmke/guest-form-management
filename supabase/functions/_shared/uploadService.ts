import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export class UploadService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  private static generateFileName(
    prefix: string,
    fullName: string,
    checkInDate: string,
    checkOutDate: string,
    originalFileName: string
  ): string {
    return `${prefix}_${checkInDate}_${checkOutDate}_${fullName}${this.getFileExtension(originalFileName)}`;
  }

  static async uploadPaymentReceipt(
    file: File, 
    fullName: string, 
    checkInDate: string,
    checkOutDate: string
  ): Promise<{ url: string; fileName: string }> {
    try {
      const fileName = this.generateFileName(
        'payment_receipt',
        fullName,
        checkInDate,
        checkOutDate,
        file.name
      );
      return await this.uploadFile(file, fileName, 'payment-receipts');
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      throw new Error('Failed to upload payment receipt');
    }
  }

  static async uploadValidId(
    file: File, 
    fullName: string, 
    checkInDate: string,
    checkOutDate: string
  ): Promise<{ url: string; fileName: string }> {
    try {
      const fileName = this.generateFileName(
        'valid_id',
        fullName,
        checkInDate,
        checkOutDate,
        file.name
      );
      return await this.uploadFile(file, fileName, 'valid-ids');
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
    return publicUrl;
  }

  // Add helper method to get file extension
  private static getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }
}
