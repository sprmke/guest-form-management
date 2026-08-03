/**
 * approve-org-verification — Super admin approves a pending org verification tier.
 * Base tier: archive peer ACTIVE tower+unit listings, then activate this org's matching properties.
 * Enhanced tier: verification only (no property status change).
 */

import { createServiceClient, serializeOrganization, type OrgRow } from '../_shared/orgAuth.ts';
import { emptyContractLegLifecycle } from '../_shared/contractLifecycle.ts';
import {
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
} from '../_shared/orgVerification.ts';
import {
  activateOrgPropertiesAfterBaseVerification,
  type UnitConflict,
} from '../_shared/propertyTowerUnit.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('approve-org-verification', async (req) => {
  requireHttpMethod(req, 'POST');
  await verifySuperAdminJwt(req);

  const body = await readJsonBody(req);
  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const tier = body.tier === 'enhanced' ? 'enhanced' : body.tier === 'base' ? 'base' : '';
  if (!orgId) return jsonError(req, 'orgId is required');
  if (!tier) return jsonError(req, 'tier must be base or enhanced');

  const supabase = createServiceClient();
  const { data: orgRow, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    console.error('[approve-org-verification]', error.message);
    throw new Error('Failed to load organization');
  }
  if (!orgRow) return jsonError(req, 'Organization not found', 404);

  const org = orgRow as OrgRow;
  const currentSettings =
    org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};
  let verification = readOrgVerificationFromSettings(currentSettings);

  if (tier === 'base') {
    if (verification.baseStatus !== 'pending') {
      return jsonError(req, 'Base verification is not pending review');
    }
    verification = {
      ...verification,
      baseStatus: 'approved',
      baseRejectionReason: null,
      baseRejectionKind: null,
      baseChangesRequestedDocs: [],
      propertyLifecycle: emptyContractLegLifecycle(),
      parkingLifecycle: emptyContractLegLifecycle(),
    };
  } else {
    if (verification.enhancedStatus !== 'pending') {
      return jsonError(req, 'Enhanced verification is not pending review');
    }
    verification = {
      ...verification,
      enhancedStatus: 'approved',
      enhancedRejectionReason: null,
      enhancedRejectionKind: null,
    };
  }

  // Base handoff before writing approved — if swap fails, status stays pending for retry.
  let activatedPropertyIds: string[] | undefined;
  let archivedPeers: UnitConflict[] | undefined;
  if (tier === 'base') {
    try {
      const handoff = await activateOrgPropertiesAfterBaseVerification(supabase, orgId);
      activatedPropertyIds = handoff.activatedPropertyIds;
      archivedPeers = handoff.archivedPeers;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unit handoff failed';
      console.error('[approve-org-verification] handoff:', message);
      return jsonError(req, message, 500);
    }
  }

  const { data, error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...currentSettings,
        verification: orgVerificationToSettingsValue(verification),
      },
    })
    .eq('id', orgId)
    .select('*')
    .single();

  if (updateError || !data) {
    console.error('[approve-org-verification]', updateError?.message);
    return jsonError(req, 'Failed to approve verification', 500);
  }

  if (tier === 'base') {
    return jsonSuccess(req, {
      organization: serializeOrganization(data as OrgRow),
      activatedPropertyIds,
      archivedPeers,
    });
  }

  return jsonSuccess(req, { organization: serializeOrganization(data as OrgRow) });
});
