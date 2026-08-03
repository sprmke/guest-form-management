/**
 * decide-contract-consideration — Super Admin grant / deny / request changes.
 * Grant: temp ACTIVE until grantedUntil (≤14d) after Phase A conflict check.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  appendConsiderationAudit,
  maxGrantedUntilYmd,
  validateGrantedUntil,
  type ContractLeg,
} from '../_shared/contractLifecycle.ts';
import { manilaTodayYmd } from '../_shared/calendarAvailabilityManila.ts';
import {
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
} from '../_shared/orgVerification.ts';
import { collectUnitConflictsForOrgProperties } from '../_shared/propertyTowerUnit.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('decide-contract-consideration', async (req, user) => {
  requireHttpMethod(req, 'POST');
  const body = await readJsonBody(req);

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const legRaw = typeof body.leg === 'string' ? body.leg.trim() : '';
  const leg: ContractLeg | null = legRaw === 'property' || legRaw === 'parking' ? legRaw : null;
  const decisionRaw = typeof body.decision === 'string' ? body.decision.trim() : '';
  const decision =
    decisionRaw === 'grant' || decisionRaw === 'deny' || decisionRaw === 'changes'
      ? decisionRaw
      : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const grantedUntilRaw = typeof body.grantedUntil === 'string' ? body.grantedUntil.trim() : '';
  const allowOverride = body.allowConsiderationOverride === true;

  if (!orgId) return jsonError(req, 'orgId is required');
  if (!leg) return jsonError(req, 'leg must be property or parking');
  if (!decision) return jsonError(req, 'decision must be grant, deny, or changes');

  const supabase = createServiceClient();
  const { data: orgRow, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .eq('id', orgId)
    .single();
  if (orgError || !orgRow) return jsonError(req, 'Organization not found', 404);

  const currentSettings =
    orgRow.settings && typeof orgRow.settings === 'object' && !Array.isArray(orgRow.settings)
      ? (orgRow.settings as Record<string, unknown>)
      : {};
  let verification = readOrgVerificationFromSettings(currentSettings);
  let life = leg === 'parking' ? verification.parkingLifecycle : verification.propertyLifecycle;

  if (life.consideration.status !== 'pending' && !allowOverride) {
    return jsonError(req, 'No pending consideration for this leg', 409);
  }

  const today = manilaTodayYmd();
  let archivedCount = 0;
  let activatedCount = 0;

  if (decision === 'grant') {
    const until = grantedUntilRaw || life.consideration.expectedDate || '';
    const dateError = validateGrantedUntil(until, today);
    if (dateError) return jsonError(req, dateError);
    if (until > maxGrantedUntilYmd(today)) {
      return jsonError(req, 'Grant cannot exceed 14 days');
    }

    if (leg === 'property') {
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('id, tower, unit_number, status')
        .eq('organization_id', orgId);
      if (propsError) return jsonError(req, propsError.message, 500);
      const { hasActiveUnitConflict, unitConflicts } = await collectUnitConflictsForOrgProperties(
        supabase,
        orgId,
        props ?? []
      );
      if (hasActiveUnitConflict) {
        return jsonError(
          req,
          `Cannot grant while another ACTIVE listing exists (${unitConflicts.map((c) => c.orgName).join(', ')})`,
          409
        );
      }
      const { error: actError, data: activated } = await supabase
        .from('properties')
        .update({ status: 'ACTIVE' })
        .eq('organization_id', orgId)
        .eq('status', 'INACTIVE')
        .select('id');
      if (actError) return jsonError(req, actError.message, 500);
      activatedCount = activated?.length ?? 0;
    } else {
      const { error: actError, data: activated } = await supabase
        .from('parkings')
        .update({ status: 'ACTIVE' })
        .eq('organization_id', orgId)
        .eq('status', 'INACTIVE')
        .select('id');
      if (actError) return jsonError(req, actError.message, 500);
      activatedCount = activated?.length ?? 0;
    }

    life = {
      ...life,
      accessLockedAt: null,
      consideration: appendConsiderationAudit(
        {
          ...life.consideration,
          status: 'granted',
          grantedUntil: until,
          allowConsiderationOverride: false,
        },
        { by: user.email, action: 'grant', note: note || null }
      ),
    };
  } else if (decision === 'deny') {
    const table = leg === 'parking' ? 'parkings' : 'properties';
    const { data: archived, error: archError } = await supabase
      .from(table)
      .update({ status: 'INACTIVE' })
      .eq('organization_id', orgId)
      .eq('status', 'ACTIVE')
      .select('id');
    if (archError) return jsonError(req, archError.message, 500);
    archivedCount = archived?.length ?? 0;

    life = {
      ...life,
      accessLockedAt: life.accessLockedAt ?? new Date().toISOString(),
      consideration: appendConsiderationAudit(
        {
          ...life.consideration,
          status: 'denied',
          grantedUntil: null,
        },
        { by: user.email, action: 'deny', note: note || null }
      ),
    };
  } else {
    // changes — host may resubmit if still in grace / override
    life = {
      ...life,
      consideration: appendConsiderationAudit(
        {
          ...life.consideration,
          status: 'changes',
          grantedUntil: null,
          selfServeUsedThisCycle: false,
          allowConsiderationOverride:
            allowOverride || life.consideration.allowConsiderationOverride,
        },
        { by: user.email, action: 'changes', note: note || null }
      ),
    };
  }

  verification =
    leg === 'parking'
      ? { ...verification, parkingLifecycle: life }
      : { ...verification, propertyLifecycle: life };

  const settings = {
    ...currentSettings,
    verification: orgVerificationToSettingsValue(verification),
  };
  const { error: saveError } = await supabase
    .from('organizations')
    .update({ settings })
    .eq('id', orgId);
  if (saveError) return jsonError(req, saveError.message, 500);

  return jsonSuccess(req, {
    leg,
    decision,
    activatedCount,
    archivedCount,
    consideration: {
      status: life.consideration.status,
      grantedUntil: life.consideration.grantedUntil,
      expectedDate: life.consideration.expectedDate,
    },
  });
});
