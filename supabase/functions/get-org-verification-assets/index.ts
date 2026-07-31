/**
 * get-org-verification-assets — GET signed preview URLs for a submitted org's verification docs (super admin).
 * Signed URLs are only returned at upload time otherwise, so review needs to re-sign stored paths.
 */

import { createServiceClient, serializeOrganization, type OrgRow } from '../_shared/orgAuth.ts';
import {
  ORG_VERIFICATION_BUCKET,
  readOrgVerificationFromSettings,
} from '../_shared/orgVerification.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function signPath(
  supabase: ReturnType<typeof createServiceClient>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(ORG_VERIFICATION_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error('[get-org-verification-assets] signed url', error.message);
    return null;
  }
  if (!data?.signedUrl) return null;
  // Kong-internal hosts only — do NOT rewrite to PUBLIC_API_URL/ngrok (breaks <img>/<iframe>).
  return formatPublicUrl(data.signedUrl);
}

serveAuthenticated('get-org-verification-assets', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId')?.trim() ?? '';
  if (!orgId) return jsonError(req, 'orgId is required');

  const supabase = createServiceClient();
  const { data: orgRow, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    console.error('[get-org-verification-assets]', error.message);
    throw new Error('Failed to load organization');
  }
  if (!orgRow) {
    return jsonError(req, 'Organization not found', 404);
  }

  const org = orgRow as OrgRow;
  const verification = readOrgVerificationFromSettings(org.settings);

  const [
    validIdUrl,
    socialProofUrl,
    propertyOwnershipProofUrl,
    parkingSocialProofUrl,
    selfieWithIdUrl,
    ownershipProofUrl,
    pmoEmailUrls,
  ] = await Promise.all([
    signPath(supabase, verification.assets.validIdPath),
    signPath(supabase, verification.assets.socialProofPath),
    signPath(supabase, verification.assets.propertyOwnershipProofPath),
    signPath(supabase, verification.assets.parkingSocialProofPath),
    signPath(supabase, verification.assets.selfieWithIdPath),
    signPath(supabase, verification.assets.ownershipProofPath),
    Promise.all(verification.assets.pmoEmailPaths.map((path) => signPath(supabase, path))),
  ]);

  return jsonSuccess(req, {
    organization: serializeOrganization(org),
    verification,
    assetUrls: {
      validIdUrl,
      socialProofUrl,
      propertyOwnershipProofUrl,
      parkingSocialProofUrl,
      selfieWithIdUrl,
      ownershipProofUrl,
      pmoEmailUrls,
    },
  });
});
