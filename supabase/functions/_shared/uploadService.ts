import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export class UploadService {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  static async uploadPaymentReceipt(file: File): Promise<{ url: string; fileName: string }> {
    console.log('Processing payment receipt upload...');
    
    const fileExt = file.name.split('.').pop();
    const tempFileName = `${Date.now()}-payment-receipt.${fileExt}`;

    const { error: uploadError } = await this.supabase
      .storage
      .from('payment-receipts')
      .upload(tempFileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload payment receipt');
    }

    const { data: { publicUrl } } = this.supabase
      .storage
      .from('payment-receipts')
      .getPublicUrl(tempFileName);

    console.log('Payment receipt uploaded successfully');
    return {
      url: publicUrl,
      fileName: tempFileName
    };
  }
} 