/**
 * submit-contract-consideration — Org owner requests temporary access during grace.
 * Auth: verifyOrgOwner. Anti-abuse: 1 self-serve per cycle, grace only, 14-day expectedDate.
 */

import { verifyOrgOwner, createServiceClient } from '../_shared/orgAuth.ts';
import {
  appendConsiderationAudit,
  canOwnerSubmitConsideration,
  type ContractLeg,
  validateGrantedUntil,
} from '../_shared/contractLifecycle.ts';
import {
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
} from '../_shared/orgVerification.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('submit-contract-consideration', async (req, user) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const legRaw = typeof body.leg === 'string' ? body.leg.trim() : '';
  const leg: ContractLeg | null = legRaw === 'property' || legRaw === 'parking' ? legRaw : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const expectedDate = typeof body.expectedDate === 'string' ? body.expectedDate.trim() : '';
  const proofRaw = body.proofPaths;
  const proofPaths = Array.isArray(proofRaw)
    ? proofRaw
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
    : [];

  if (!orgId) return jsonError(req, 'orgId is required');
  if (!leg) return jsonError(req, 'leg must be property or parking');
  if (!note) return jsonError(req, 'note is required');
  if (note.length > 2000) return jsonError(req, 'note is too long');
  const dateError = validateGrantedUntil(expectedDate);
  if (dateError) return jsonError(req, dateError);
  if (proofPaths.length < 1) return jsonError(req, 'At least one proof is required');
  for (const path of proofPaths) {
    if (!path.startsWith(`org/${orgId}/`)) {
      return jsonError(req, 'Invalid proof path');
    }
  }

  const { org } = await verifyOrgOwner(req, orgId);
  const supabase = createServiceClient();

  const currentSettings =
    org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};
  let verification = readOrgVerificationFromSettings(currentSettings);
  const contractEnd =
    leg === 'parking' ? verification.parkingContractEndDate : verification.propertyContractEndDate;
  const life = leg === 'parking' ? verification.parkingLifecycle : verification.propertyLifecycle;

  const gate = canOwnerSubmitConsideration(life, contractEnd);
  if (!gate.ok) return jsonError(req, gate.reason, 409);

  const consideration = appendConsiderationAudit(
    {
      ...life.consideration,
      status: 'pending',
      note,
      expectedDate,
      grantedUntil: null,
      proofPaths,
      selfServeUsedThisCycle: true,
    },
    {
      by: user.email,
      action: 'submit',
      note,
    }
  );

  const nextLife = { ...life, consideration };
  verification =
    leg === 'parking'
      ? { ...verification, parkingLifecycle: nextLife }
      : { ...verification, propertyLifecycle: nextLife };

  const settings = {
    ...currentSettings,
    verification: orgVerificationToSettingsValue(verification),
  };
  const { error } = await supabase.from('organizations').update({ settings }).eq('id', orgId);
  if (error) return jsonError(req, error.message, 500);

  return jsonSuccess(req, {
    leg,
    consideration: {
      status: consideration.status,
      expectedDate: consideration.expectedDate,
      selfServeUsedThisCycle: consideration.selfServeUsedThisCycle,
    },
  });
});
