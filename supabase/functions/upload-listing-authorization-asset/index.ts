/**
 * upload-listing-authorization-asset — Owner upload for per-listing authorization proofs.
 * Auth: listing owner via listingKind + listingId. Private bucket; returns a signed preview URL.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  applyListingAssetPath,
  isListingAuthorizationHardRejected,
  LISTING_AUTHORIZATION_ASSET_TYPES,
  LISTING_AUTHORIZATION_BUCKET,
  type ListingAuthorizationAssetType,
} from '../_shared/listingAuthorization.ts';
import {
  parseListingKind,
  saveListingAuthorization,
  serializeListingAuthorization,
  verifyListingOwner,
} from '../_shared/listingAuthorizationService.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { assertWithinUploadLimit } from '../_shared/uploadLimits.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

function extensionFor(mime: string): string {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/heic' || mime === 'image/heif') return '.heic';
  return '.jpg';
}

serveAuthenticated('upload-listing-authorization-asset', async (req) => {
  requireHttpMethod(req, 'POST');

  const formData = await req.formData();
  const readField = (key: string) =>
    typeof formData.get(key) === 'string' ? String(formData.get(key)).trim() : '';

  const listingKind = parseListingKind(readField('listingKind'));
  const listingId = readField('listingId');
  const assetTypeRaw = readField('assetType');
  const file = formData.get('file');

  if (!listingKind) return jsonError(req, 'listingKind must be property or parking');
  if (!listingId) return jsonError(req, 'listingId is required');
  if (!(LISTING_AUTHORIZATION_ASSET_TYPES as readonly string[]).includes(assetTypeRaw)) {
    return jsonError(req, 'Invalid assetType');
  }
  if (!(file instanceof File)) return jsonError(req, 'file is required');

  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return jsonError(req, 'File must be JPEG, PNG, WebP, or PDF');
  assertWithinUploadLimit(file, mime === 'application/pdf' ? 'pdf' : 'document');

  const assetType = assetTypeRaw as ListingAuthorizationAssetType;
  const context = await verifyListingOwner(req, listingKind, listingId);

  if (isListingAuthorizationHardRejected(context.authorization)) {
    return jsonError(req, 'This listing was declined. Please start a new application.');
  }

  const supabase = createServiceClient();
  const storagePath = `org/${context.org.id}/${listingKind}/${listingId}/${assetType}/${crypto.randomUUID()}${extensionFor(mime)}`;

  const { error: uploadError } = await supabase.storage
    .from(LISTING_AUTHORIZATION_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: mime });

  if (uploadError) {
    console.error('[upload-listing-authorization-asset]', uploadError.message);
    return jsonError(req, 'Upload failed', 500);
  }

  const next = applyListingAssetPath(context.authorization, assetType, storagePath);
  const listing = await saveListingAuthorization(supabase, context, next);

  const { data: signed, error: signedError } = await supabase.storage
    .from(LISTING_AUTHORIZATION_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError) {
    console.error('[upload-listing-authorization-asset] signed url', signedError.message);
  }

  return jsonSuccess(req, {
    path: storagePath,
    previewUrl: signed?.signedUrl ? formatPublicUrl(signed.signedUrl) : null,
    assetType,
    ...serializeListingAuthorization(context, next, listing),
  });
});
