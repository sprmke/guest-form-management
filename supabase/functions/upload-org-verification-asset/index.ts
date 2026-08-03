/**
 * upload-org-verification-asset — Owner upload for host verification proofs.
 * Auth: verifyOrgOwner via orgId. Private bucket; returns signed preview URL.
 */

import { verifyOrgOwner, createServiceClient } from '../_shared/orgAuth.ts';
import {
  applyAssetPath,
  ORG_VERIFICATION_ASSET_TYPES,
  ORG_VERIFICATION_BUCKET,
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
  type OrgVerificationAssetType,
} from '../_shared/orgVerification.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

/** Upload-only proofs for contract consideration (not stored on verification.assets). */
const CONSIDERATION_PROOF_ASSET_TYPES = [
  'property_consideration_proof',
  'parking_consideration_proof',
] as const;
type ConsiderationProofAssetType = (typeof CONSIDERATION_PROOF_ASSET_TYPES)[number];

function isConsiderationProofType(value: string): value is ConsiderationProofAssetType {
  return (CONSIDERATION_PROOF_ASSET_TYPES as readonly string[]).includes(value);
}

serveAuthenticated('upload-org-verification-asset', async (req) => {
  requireHttpMethod(req, 'POST');

  const formData = await req.formData();
  const orgId =
    typeof formData.get('orgId') === 'string' ? String(formData.get('orgId')).trim() : '';
  const assetTypeRaw =
    typeof formData.get('assetType') === 'string' ? String(formData.get('assetType')).trim() : '';
  const file = formData.get('file');

  if (!orgId) return jsonError(req, 'orgId is required');
  const considerationProof = isConsiderationProofType(assetTypeRaw);
  if (
    !considerationProof &&
    !ORG_VERIFICATION_ASSET_TYPES.includes(assetTypeRaw as OrgVerificationAssetType)
  ) {
    return jsonError(req, 'Invalid assetType');
  }
  if (!(file instanceof File)) return jsonError(req, 'file is required');

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return jsonError(req, 'File must be JPEG, PNG, WebP, or PDF');
  }
  if (file.size > 5 * 1024 * 1024) {
    return jsonError(req, 'File must be 5 MB or smaller');
  }

  await verifyOrgOwner(req, orgId);

  const supabase = createServiceClient();
  const { data: orgRow, error: orgError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  if (orgError || !orgRow) {
    return jsonError(req, 'Organization not found', 404);
  }

  const currentSettings =
    orgRow.settings && typeof orgRow.settings === 'object' && !Array.isArray(orgRow.settings)
      ? (orgRow.settings as Record<string, unknown>)
      : {};
  const existingVerification = readOrgVerificationFromSettings(currentSettings);
  if (
    !considerationProof &&
    existingVerification.baseStatus === 'rejected' &&
    existingVerification.baseRejectionKind === 'rejected'
  ) {
    return jsonError(req, 'This verification was declined. Please start a new application.');
  }

  const ext =
    mime === 'application/pdf'
      ? '.pdf'
      : mime === 'image/png'
        ? '.png'
        : mime === 'image/webp'
          ? '.webp'
          : '.jpg';
  const storagePath = `org/${orgId}/${assetTypeRaw}/${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ORG_VERIFICATION_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: mime });

  if (uploadError) {
    console.error('[upload-org-verification-asset]', uploadError.message);
    return jsonError(req, 'Upload failed', 500);
  }

  if (considerationProof) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(ORG_VERIFICATION_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError) {
      console.error('[upload-org-verification-asset] signed url', signedError.message);
    }

    return jsonSuccess(req, {
      path: storagePath,
      previewUrl: signed?.signedUrl ? formatPublicUrl(signed.signedUrl) : null,
      assetType: assetTypeRaw,
    });
  }

  const assetType = assetTypeRaw as OrgVerificationAssetType;
  const verification = applyAssetPath(existingVerification, assetType, storagePath);

  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...currentSettings,
        verification: orgVerificationToSettingsValue(verification),
      },
    })
    .eq('id', orgId);

  if (updateError) {
    console.error('[upload-org-verification-asset] settings', updateError.message);
    return jsonError(req, 'Failed to save verification asset', 500);
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(ORG_VERIFICATION_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError) {
    console.error('[upload-org-verification-asset] signed url', signedError.message);
  }

  return jsonSuccess(req, {
    path: storagePath,
    previewUrl: signed?.signedUrl ? formatPublicUrl(signed.signedUrl) : null,
    assetType,
    verification: {
      baseStatus: verification.baseStatus,
      enhancedStatus: verification.enhancedStatus,
      socialPlatform: verification.socialPlatform,
      parkingSocialPlatform: verification.parkingSocialPlatform,
      parkingRelationship: verification.parkingRelationship,
      hasValidId: Boolean(verification.assets.validIdPath),
      hasSocialProof: Boolean(verification.assets.socialProofPath),
      hasPropertyOwnershipProof: Boolean(verification.assets.propertyOwnershipProofPath),
      hasParkingSocialProof: Boolean(verification.assets.parkingSocialProofPath),
      hasSelfieWithId: Boolean(verification.assets.selfieWithIdPath),
      hasOwnershipProof: Boolean(verification.assets.ownershipProofPath),
      pmoEmailCount: verification.assets.pmoEmailPaths.length,
    },
  });
});
