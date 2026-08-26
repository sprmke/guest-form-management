/**
 * list-organizations — GET returns orgs the user owns or has property membership in.
 * Auth: verifyAuthenticatedUser.
 */

import {
  createServiceClient,
  isPlatformAdmin,
  isSuperAdminEmail,
  serializeOrganization,
  type OrgAccessKind,
  type OrgRow,
} from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function accessKindForOrg(
  orgId: string,
  ownedIds: Set<string>,
  orgAdminIds: Set<string>,
  platformAdmin: boolean
): OrgAccessKind {
  if (platformAdmin) return 'platform_admin';
  if (ownedIds.has(orgId)) return 'owner';
  if (orgAdminIds.has(orgId)) return 'org_admin';
  return 'property_member';
}

serveAuthenticated('list-organizations', async (req, user) => {
  requireHttpMethod(req, 'GET');

  const supabase = createServiceClient();

  if (isSuperAdminEmail(user.email)) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[list-organizations]', error.message);
      throw new Error('Failed to list organizations');
    }

    return jsonSuccess(req, {
      organizations: ((data ?? []) as OrgRow[]).map((org) => ({
        ...serializeOrganization(org),
        accessKind: 'platform_admin' as OrgAccessKind,
      })),
    });
  }

  const platformAdmin = isPlatformAdmin(user.email);
  const { data: owned, error: ownedError } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id);

  if (ownedError) {
    console.error('[list-organizations]', ownedError.message);
    throw new Error('Failed to list organizations');
  }

  const ownedIds = new Set((owned ?? []).map((row) => row.id as string));

  const { data: memberRows, error: memberError } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (memberError) {
    console.error('[list-organizations]', memberError.message);
    throw new Error('Failed to list organizations');
  }

  const { data: planLimitedMemberRows, error: planLimitedMemberError } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('user_id', user.id)
    .eq('status', 'inactive')
    .eq('plan_limited', true);

  if (planLimitedMemberError) {
    console.error('[list-organizations]', planLimitedMemberError.message);
    throw new Error('Failed to list organizations');
  }

  const memberOrgIds = new Set<string>();
  const planLimitedPropertyOrgIds = new Set<string>();
  const activePropertyIds = (memberRows ?? [])
    .map((row) => row.property_id as string)
    .filter(Boolean);
  const planLimitedPropertyIds = (planLimitedMemberRows ?? [])
    .map((row) => row.property_id as string)
    .filter(Boolean);
  const propertyIds = [...new Set([...activePropertyIds, ...planLimitedPropertyIds])];

  if (propertyIds.length > 0) {
    const { data: props, error: propsError } = await supabase
      .from('properties')
      .select('id, organization_id')
      .in('id', propertyIds);

    if (propsError) {
      console.error('[list-organizations]', propsError.message);
      throw new Error('Failed to list organizations');
    }

    const activePropertyIdSet = new Set(activePropertyIds);
    const planLimitedPropertyIdSet = new Set(planLimitedPropertyIds);
    for (const row of props ?? []) {
      const orgId = row.organization_id as string;
      const propertyId = row.id as string;
      if (activePropertyIdSet.has(propertyId)) {
        memberOrgIds.add(orgId);
      }
      if (planLimitedPropertyIdSet.has(propertyId)) {
        planLimitedPropertyOrgIds.add(orgId);
      }
    }
  }

  const { data: orgAdminRows, error: orgAdminError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('role_id', 'ADMIN');

  if (orgAdminError) {
    console.error('[list-organizations]', orgAdminError.message);
    throw new Error('Failed to list organizations');
  }

  const orgAdminIds = new Set((orgAdminRows ?? []).map((row) => row.organization_id as string));

  const { data: planLimitedOrgAdminRows, error: planLimitedOrgAdminError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'inactive')
    .eq('plan_limited', true)
    .eq('role_id', 'ADMIN');

  if (planLimitedOrgAdminError) {
    console.error('[list-organizations]', planLimitedOrgAdminError.message);
    throw new Error('Failed to list organizations');
  }

  const planLimitedOrgAdminIds = new Set(
    (planLimitedOrgAdminRows ?? []).map((row) => row.organization_id as string)
  );

  let memberOrgs: OrgRow[] = [];
  const propertyScopedOrgIds = [...new Set([...memberOrgIds, ...planLimitedPropertyOrgIds])];
  if (propertyScopedOrgIds.length > 0) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .in('id', propertyScopedOrgIds);

    if (error) {
      console.error('[list-organizations]', error.message);
      throw new Error('Failed to list organizations');
    }
    memberOrgs = (data ?? []) as OrgRow[];
  }

  const byId = new Map<string, OrgRow>();
  for (const org of [...(owned ?? []), ...memberOrgs] as OrgRow[]) {
    byId.set(org.id, org);
  }

  const extraOrgIds = [...planLimitedOrgAdminIds].filter((id) => !byId.has(id));
  if (extraOrgIds.length > 0) {
    const { data, error } = await supabase.from('organizations').select('*').in('id', extraOrgIds);
    if (error) {
      console.error('[list-organizations]', error.message);
      throw new Error('Failed to list organizations');
    }
    for (const org of (data ?? []) as OrgRow[]) {
      byId.set(org.id, org);
    }
  }

  const organizations = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

  return jsonSuccess(req, {
    organizations: organizations.map((org) => ({
      ...serializeOrganization(org),
      accessKind: accessKindForOrg(org.id, ownedIds, orgAdminIds, platformAdmin),
      planLimited:
        !ownedIds.has(org.id) &&
        !orgAdminIds.has(org.id) &&
        (planLimitedOrgAdminIds.has(org.id) ||
          (planLimitedPropertyOrgIds.has(org.id) && !memberOrgIds.has(org.id))),
    })),
  });
});
