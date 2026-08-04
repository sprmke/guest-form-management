/**
 * list-org-verifications — GET orgs with a submitted Tier 1 (host) verification (super admin).
 * Attaches unitConflicts[] / hasActiveUnitConflict for tower+unit succession UX.
 */

import { createServiceClient, type OrgRow } from '../_shared/orgAuth.ts';
import { loadAuthUserProfile } from '../_shared/authUserProfile.ts';
import { readOrgVerificationFromSettings } from '../_shared/orgVerification.ts';
import {
  collectUnitConflictsForOrgProperties,
  listPropertyTowerUnitPeers,
  type PropertyTowerUnitPeer,
} from '../_shared/propertyTowerUnit.ts';
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

  const submitted = rows.filter((row) => {
    const verification = readOrgVerificationFromSettings(row.settings);
    return verification.baseStatus !== 'none' || verification.enhancedStatus !== 'none';
  });

  const submittedIds = submitted.map((row) => row.id);
  const propsByOrg = new Map<
    string,
    Array<{ id: string; tower: string | null; unit_number: string | null }>
  >();
  const peersByPair = new Map<string, PropertyTowerUnitPeer[]>();

  if (submittedIds.length > 0) {
    const { data: propRows, error: propError } = await supabase
      .from('properties')
      .select('id, organization_id, tower, unit_number')
      .in('organization_id', submittedIds);

    if (propError) {
      console.error('[list-org-verifications] properties:', propError.message);
      throw new Error('Failed to load organization properties');
    }

    const pairKeys = new Set<string>();
    for (const row of propRows ?? []) {
      const orgId = row.organization_id as string;
      const list = propsByOrg.get(orgId) ?? [];
      list.push({
        id: row.id as string,
        tower: (row.tower as string | null) ?? null,
        unit_number: (row.unit_number as string | null) ?? null,
      });
      propsByOrg.set(orgId, list);

      const tower = typeof row.tower === 'string' ? row.tower.trim() : '';
      const unitNumber = typeof row.unit_number === 'string' ? row.unit_number.trim() : '';
      if (tower && unitNumber) {
        pairKeys.add(`${tower}\0${unitNumber}`);
      }
    }

    await Promise.all(
      [...pairKeys].map(async (key) => {
        const [tower, unitNumber] = key.split('\0') as [string, string];
        peersByPair.set(key, await listPropertyTowerUnitPeers(supabase, tower, unitNumber));
      })
    );
  }

  const approvals = await Promise.all(
    submitted.map(async (row) => {
      const verification = readOrgVerificationFromSettings(row.settings);
      const owner = await loadAuthUserProfile(supabase, row.owner_id);
      const { unitConflicts, hasActiveUnitConflict } = await collectUnitConflictsForOrgProperties(
        supabase,
        row.id,
        propsByOrg.get(row.id) ?? [],
        peersByPair
      );
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
        enhancedStatus: verification.enhancedStatus,
        enhancedSubmittedAt: verification.enhancedSubmittedAt,
        createdAt: row.created_at,
        unitConflicts,
        hasActiveUnitConflict,
        propertyConsiderationStatus: verification.propertyLifecycle.consideration.status,
        parkingConsiderationStatus: verification.parkingLifecycle.consideration.status,
        hasPendingConsideration:
          verification.propertyLifecycle.consideration.status === 'pending' ||
          verification.parkingLifecycle.consideration.status === 'pending',
        propertyAccessLocked: Boolean(verification.propertyLifecycle.accessLockedAt),
        parkingAccessLocked: Boolean(verification.parkingLifecycle.accessLockedAt),
      };
    })
  );

  approvals.sort((a, b) => {
    const aRecommendedPending = a.enhancedStatus === 'pending' ? 1 : 0;
    const bRecommendedPending = b.enhancedStatus === 'pending' ? 1 : 0;
    if (bRecommendedPending !== aRecommendedPending) {
      return bRecommendedPending - aRecommendedPending;
    }
    const aTime = a.enhancedSubmittedAt ?? a.baseSubmittedAt ?? '';
    const bTime = b.enhancedSubmittedAt ?? b.baseSubmittedAt ?? '';
    return bTime.localeCompare(aTime);
  });

  return jsonSuccess(req, { approvals });
});
