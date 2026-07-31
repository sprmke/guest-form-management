/**
 * list-org-verifications — GET orgs with a submitted Tier 1 (host) verification (super admin).
 */

import { createServiceClient, type OrgRow } from '../_shared/orgAuth.ts';
import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { readOrgVerificationFromSettings } from '../_shared/orgVerification.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-org-verifications', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, owner_id, host_modes, settings, created_at');

  if (error) {
    console.error('[list-org-verifications]', error.message);
    throw new Error('Failed to list organizations');
  }

  const rows = (data ?? []) as Pick<
    OrgRow,
    'id' | 'name' | 'slug' | 'owner_id' | 'host_modes' | 'settings' | 'created_at'
  >[];

  const submitted = rows.filter(
    (row) => readOrgVerificationFromSettings(row.settings).baseStatus !== 'none'
  );

  const approvals = await Promise.all(
    submitted.map(async (row) => {
      const verification = readOrgVerificationFromSettings(row.settings);
      const owner = await loadAuthUserProfile(supabase, row.owner_id);
      return {
        organizationId: row.id,
        organizationName: row.name,
        organizationSlug: row.slug,
        hostModes: Array.isArray(row.host_modes) ? row.host_modes : [],
        ownerName: owner.name,
        ownerEmail: owner.email,
        baseStatus: verification.baseStatus,
        baseSubmittedAt: verification.baseSubmittedAt,
        baseRejectionReason: verification.baseRejectionReason,
        baseRejectionKind: verification.baseRejectionKind,
        createdAt: row.created_at,
      };
    })
  );

  approvals.sort((a, b) => {
    const aTime = a.baseSubmittedAt ?? '';
    const bTime = b.baseSubmittedAt ?? '';
    return bTime.localeCompare(aTime);
  });

  return jsonSuccess(req, { approvals });
});
