/**
 * Daily Manila contract-expiry cron — Unit handoff Phase B.
 * Notices T−15/T−7/T−1; T+0 archive; T+3 reminder; T+5 lock; grant expiry revoke.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { manilaTodayYmd } from './calendarAvailabilityManila.ts';
import {
  emptyContractLegLifecycle,
  hasActiveConsiderationGrant,
  isContractLifecycleApplicable,
  markNoticeSent,
  shouldArchiveAtT0,
  shouldLockAtT5,
  shouldRevokeExpiredGrant,
  shouldSendGraceReminder,
  shouldSendPreExpiryNotice,
  type ContractLeg,
  type ContractLegLifecycle,
  type ContractNoticeMilestone,
} from './contractLifecycle.ts';
import { sendContractLifecycleNoticeEmail } from './contractLifecycleEmail.ts';
import {
  orgVerificationToSettingsValue,
  readOrgVerificationFromSettings,
  type OrgVerificationState,
} from './orgVerification.ts';
import { resolveSupabaseServiceRoleKey, resolveSupabaseUrl } from './supabaseRuntimeEnv.ts';

export function verifyContractExpiryCronSecret(req: Request): boolean {
  const expected = Deno.env.get('CONTRACT_EXPIRY_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-contract-expiry-cron-secret')?.trim();
  return got === expected;
}

type OrgRow = {
  id: string;
  name: string;
  owner_id: string;
  settings: Record<string, unknown> | null;
};

function legLifecycle(verification: OrgVerificationState, leg: ContractLeg): ContractLegLifecycle {
  return leg === 'parking' ? verification.parkingLifecycle : verification.propertyLifecycle;
}

function setLegLifecycle(
  verification: OrgVerificationState,
  leg: ContractLeg,
  next: ContractLegLifecycle
): OrgVerificationState {
  if (leg === 'parking') return { ...verification, parkingLifecycle: next };
  return { ...verification, propertyLifecycle: next };
}

function contractEndForLeg(verification: OrgVerificationState, leg: ContractLeg): string | null {
  return leg === 'parking'
    ? verification.parkingContractEndDate
    : verification.propertyContractEndDate;
}

function rightsForLeg(verification: OrgVerificationState, leg: ContractLeg) {
  return leg === 'parking' ? verification.parkingRelationship : verification.propertyRelationship;
}

async function persistVerification(
  supabase: SupabaseClient,
  org: OrgRow,
  verification: OrgVerificationState
): Promise<void> {
  const settings = {
    ...(org.settings && typeof org.settings === 'object' ? org.settings : {}),
    verification: orgVerificationToSettingsValue(verification),
  };
  const { error } = await supabase.from('organizations').update({ settings }).eq('id', org.id);
  if (error) throw new Error(`Failed to save org ${org.id}: ${error.message}`);
  org.settings = settings;
}

async function setListingsInactive(
  supabase: SupabaseClient,
  orgId: string,
  leg: ContractLeg
): Promise<number> {
  const table = leg === 'parking' ? 'parkings' : 'properties';
  const { data, error } = await supabase
    .from(table)
    .update({ status: 'INACTIVE' })
    .eq('organization_id', orgId)
    .eq('status', 'ACTIVE')
    .select('id');
  if (error) throw new Error(`Failed to archive ${table} for ${orgId}: ${error.message}`);
  return data?.length ?? 0;
}

async function notifySafe(
  supabase: SupabaseClient,
  org: OrgRow,
  leg: ContractLeg,
  contractEndYmd: string,
  milestone: Parameters<typeof sendContractLifecycleNoticeEmail>[0]['milestone']
): Promise<boolean> {
  try {
    await sendContractLifecycleNoticeEmail({
      supabase,
      ownerId: org.owner_id,
      organizationName: org.name,
      leg,
      contractEndYmd,
      milestone,
    });
    return true;
  } catch (err) {
    console.error('[contractExpiryCron] email failed', org.id, leg, milestone, err);
    return false;
  }
}

async function processLeg(
  supabase: SupabaseClient,
  org: OrgRow,
  verification: OrgVerificationState,
  leg: ContractLeg,
  todayYmd: string,
  counters: Record<string, number>
): Promise<OrgVerificationState> {
  if (!isContractLifecycleApplicable(rightsForLeg(verification, leg))) {
    return verification;
  }
  const contractEndYmd = contractEndForLeg(verification, leg);
  if (!contractEndYmd) return verification;

  let life = legLifecycle(verification, leg) ?? emptyContractLegLifecycle();
  let dirty = false;
  const nowIso = new Date().toISOString();

  const preNotices: Array<'t_minus_15' | 't_minus_7' | 't_minus_1'> = [
    't_minus_15',
    't_minus_7',
    't_minus_1',
  ];
  for (const milestone of preNotices) {
    if (!shouldSendPreExpiryNotice(contractEndYmd, milestone, life.noticesSent, todayYmd)) {
      continue;
    }
    const sent = await notifySafe(supabase, org, leg, contractEndYmd, milestone);
    if (sent) {
      life = markNoticeSent(life, milestone, nowIso);
      dirty = true;
      counters.notices += 1;
    }
  }

  if (shouldArchiveAtT0(contractEndYmd, life.noticesSent, todayYmd)) {
    if (!hasActiveConsiderationGrant(life, todayYmd)) {
      const archived = await setListingsInactive(supabase, org.id, leg);
      counters.archived += archived;
    }
    const sent = await notifySafe(supabase, org, leg, contractEndYmd, 't_plus_0_archived');
    life = markNoticeSent(life, 't_plus_0_archived', nowIso);
    dirty = true;
    if (sent) counters.notices += 1;
  }

  if (shouldSendGraceReminder(contractEndYmd, life.noticesSent, todayYmd)) {
    const sent = await notifySafe(supabase, org, leg, contractEndYmd, 't_plus_3');
    if (sent) {
      life = markNoticeSent(life, 't_plus_3', nowIso);
      dirty = true;
      counters.notices += 1;
    }
  }

  if (shouldRevokeExpiredGrant(life, todayYmd)) {
    await setListingsInactive(supabase, org.id, leg);
    life = {
      ...life,
      accessLockedAt: life.accessLockedAt ?? nowIso,
      consideration: {
        ...life.consideration,
        status: 'denied',
        grantedUntil: null,
      },
    };
    life = markNoticeSent(life, 'grant_expired' satisfies ContractNoticeMilestone, nowIso);
    dirty = true;
    counters.grantExpired += 1;
    const sent = await notifySafe(supabase, org, leg, contractEndYmd, 'grant_expired');
    if (sent) counters.notices += 1;
  }

  if (shouldLockAtT5(contractEndYmd, life, todayYmd)) {
    await setListingsInactive(supabase, org.id, leg);
    life = {
      ...life,
      accessLockedAt: nowIso,
    };
    life = markNoticeSent(life, 't_plus_5_locked', nowIso);
    dirty = true;
    counters.locked += 1;
    const sent = await notifySafe(supabase, org, leg, contractEndYmd, 't_plus_5_locked');
    if (sent) counters.notices += 1;
  }

  return dirty ? setLegLifecycle(verification, leg, life) : verification;
}

export async function runContractExpiryCron(): Promise<Record<string, unknown>> {
  const supabase = createClient(resolveSupabaseUrl(), resolveSupabaseServiceRoleKey());
  const todayYmd = manilaTodayYmd();

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, owner_id, settings');
  if (error) throw new Error(`list orgs failed: ${error.message}`);

  const counters = {
    scanned: 0,
    updated: 0,
    notices: 0,
    archived: 0,
    locked: 0,
    grantExpired: 0,
  };

  for (const row of orgs ?? []) {
    const org = row as OrgRow;
    counters.scanned += 1;
    let verification = readOrgVerificationFromSettings(
      (org.settings ?? {}) as Record<string, unknown>
    );
    const before = JSON.stringify(orgVerificationToSettingsValue(verification));

    verification = await processLeg(supabase, org, verification, 'property', todayYmd, counters);
    verification = await processLeg(supabase, org, verification, 'parking', todayYmd, counters);

    const after = JSON.stringify(orgVerificationToSettingsValue(verification));
    if (before !== after) {
      await persistVerification(supabase, org, verification);
      counters.updated += 1;
    }
  }

  return { todayYmd, ...counters };
}
