import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export class UploadService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  private static formatName(fullName: string): string {
    return fullName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
  }

  private static generateFileName(
    prefix: string,
    fullName: string,
    checkInDate: string,
    checkOutDate: string,
    originalFileName: string
  ): string {
    const formattedName = this.formatName(fullName);
    return `${prefix}_${checkInDate}_${checkOutDate}_${formattedName}_${originalFileName}`;
  }

  static async uploadPaymentReceipt(
    file: File | null, 
    fullName: string, 
    checkInDate: string,
    checkOutDate: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No payment receipt file provided, skipping upload');
        return '';
      }
      
      const fileName = this.generateFileName(
        'payment_receipt',
        fullName,
        checkInDate,
        checkOutDate,
        file.name
      );
      const { url } = await this.uploadFile(file, fileName, 'payment-receipts');
      return url;
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      throw new Error('Failed to upload payment receipt');
    }
  }

  static async uploadValidId(
    file: File | null, 
    fullName: string, 
    checkInDate: string,
    checkOutDate: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No valid ID file provided, skipping upload');
        return '';
      }
      
      const fileName = this.generateFileName(
        'valid_id',
        fullName,
        checkInDate,
        checkOutDate,
        file.name
      );
      const { url } = await this.uploadFile(file, fileName, 'valid-ids');
      return url;
    } catch (error) {
      console.error('Error uploading valid ID:', error);
      throw new Error('Failed to upload valid ID');
    }
  }

  static async uploadFile(file: File, fileName: string, bucket: string): Promise<{ url: string }> {
    console.log(`Processing ${bucket} upload...`);
    
    // First check if the file already exists
    const { data: existingFile } = await this.supabase
      .storage
      .from(bucket)
      .list('', {
        search: fileName
      });
    
    // If file already exists, just return its public URL
    if (existingFile && existingFile.length > 0) {
      console.log(`File ${fileName} already exists in ${bucket}, skipping upload`);
      const { data: { publicUrl } } = this.supabase
        .storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      return { url: publicUrl };
    }
    
    // Otherwise, upload the new file
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

  // Add helper method to get file extension
  private static getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }
}
