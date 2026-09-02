/**
 * Shared org team logo upload — used by upload-org-settings-asset and AI assistant apply.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { DatabaseService } from './databaseService.ts';
import { invalidateAppSettingsCache } from './appSettings.ts';
import { ensureOrgSettingsRow, invalidateOrgSettingsCache } from './orgSettings.ts';
import { assertWithinUploadLimit } from './uploadLimits.ts';
import { formatPublicUrl } from './utils.ts';

const BUCKET = 'app-settings-assets';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ApplyOrgTeamLogoInput = {
  organizationId: string;
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type ApplyOrgTeamLogoResult = {
  url: string;
  bucket: string;
  path: string;
  column: 'email_logo_url';
  replacedExisting: boolean;
};

function extensionFor(mime: string, fileName: string): string {
  if (fileName.includes('.')) {
    return `.${fileName.split('.').pop()?.toLowerCase()}`;
  }
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

export async function applyOrgTeamLogoFromBytes(
  input: ApplyOrgTeamLogoInput
): Promise<ApplyOrgTeamLogoResult> {
  const mime = (input.mimeType || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('File must be JPEG, PNG, or WebP');
  }

  const file = new File([input.bytes], input.fileName || 'logo.jpg', { type: mime });
  assertWithinUploadLimit(file, 'image');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('logo_url')
    .eq('id', input.organizationId)
    .maybeSingle();
  const replacedExisting = Boolean(typeof orgRow?.logo_url === 'string' && orgRow.logo_url.trim());

  const ext = extensionFor(mime, input.fileName || 'logo.jpg');
  const storagePath = `team-logo/org/${input.organizationId}/current${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: mime });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const safePublicUrl = formatPublicUrl(publicUrl);

  await ensureOrgSettingsRow(input.organizationId);
  await DatabaseService.updateOrgSettings({ email_logo_url: safePublicUrl }, input.organizationId);
  await supabase
    .from('organizations')
    .update({ logo_url: safePublicUrl })
    .eq('id', input.organizationId);

  invalidateOrgSettingsCache(input.organizationId);
  invalidateAppSettingsCache();

  return {
    url: safePublicUrl,
    bucket: BUCKET,
    path: storagePath,
    column: 'email_logo_url',
    replacedExisting,
  };
}
