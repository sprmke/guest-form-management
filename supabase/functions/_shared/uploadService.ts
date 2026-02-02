import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

/**
 * Sanitizes a filename for use as a Supabase Storage object key.
 * Supabase Storage rejects object names with special characters (apostrophes,
 * quotes, %, non-ASCII, etc.). This keeps the extension and replaces
 * problematic characters with underscores.
 */
function sanitizeStorageFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return fileName;
  // Decode URL-encoded spaces and other sequences so we don't use literal % in path
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // If decoding fails, use as-is and sanitize below
  }
  // Replace characters that cause "object name contains invalid characters" in Supabase Storage
  const sanitized = fileName
    .replace(/[''`"]/g, '_')           // apostrophes and quotes
    .replace(/[%#?\\]/g, '_')          // percent, hash, question, backslash
    .replace(/\s+/g, '_');             // spaces
  return sanitized || fileName;
}

export class UploadService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async uploadPaymentReceipt(
    file: File | null, 
    fileName: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No payment receipt file provided, skipping upload');
        return '';
      }
      
      const { url } = await this.uploadFile(file, fileName, 'payment-receipts');
      return url;
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      throw new Error('Failed to upload payment receipt');
    }
  }

  static async uploadValidId(
    file: File | null, 
    fileName: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No valid ID file provided, skipping upload');
        return '';
      }
      
      const { url } = await this.uploadFile(file, fileName, 'valid-ids');
      return url;
    } catch (error) {
      console.error('Error uploading valid ID:', error);
      throw new Error('Failed to upload valid ID');
    }
  }

  static async uploadPetVaccination(
    file: File | null,
    fileName: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No pet vaccination file provided, skipping upload');
        return '';
      }
      
      const { url } = await this.uploadFile(file, fileName, 'pet-vaccinations');
      return url;
    } catch (error) {
      console.error('Error uploading pet vaccination:', error);
      throw new Error('Failed to upload pet vaccination record');
    }
  }

  static async uploadPetImage(
    file: File | null,
    fileName: string
  ): Promise<string> {
    try {
      if (!file) {
        console.log('No pet image file provided, skipping upload');
        return '';
      }
      
      const { url } = await this.uploadFile(file, fileName, 'pet-images');
      return url;
    } catch (error) {
      console.error('Error uploading pet image:', error);
      throw new Error('Failed to upload pet image');
    }
  }

  static async uploadFile(file: File, fileName: string, bucket: string): Promise<{ url: string }> {
    const storageKey = sanitizeStorageFileName(fileName);
    if (storageKey !== fileName) {
      console.log(`Sanitized storage key: "${fileName}" -> "${storageKey}"`);
    }
    console.log(`Processing ${bucket} upload...`);

    // Only skip upload if we have an exact filename match (search can return partial matches)
    const { data: listedFiles } = await this.supabase
      .storage
      .from(bucket)
      .list('', {
        search: storageKey
      });

    const exactMatch = Array.isArray(listedFiles) && listedFiles.some(
      (item: { name?: string }) => item.name === storageKey
    );

    if (exactMatch) {
      console.log(`File ${storageKey} already exists in ${bucket}, skipping upload`);
      const { data: { publicUrl } } = this.supabase
        .storage
        .from(bucket)
        .getPublicUrl(storageKey);

      return { url: publicUrl };
    }

    // Otherwise, upload the new file using sanitized key
    const { error: uploadError } = await this.supabase
      .storage
      .from(bucket)
      .upload(storageKey, file);

    if (uploadError) {
      console.error(`${bucket} upload error:`, uploadError);
      throw new Error(`Failed to upload file to ${bucket}`);
    }

    const { data: { publicUrl } } = this.supabase
      .storage
      .from(bucket)
      .getPublicUrl(storageKey);

    console.log(`${bucket} uploaded successfully`);
    return { url: publicUrl };
  }
}
