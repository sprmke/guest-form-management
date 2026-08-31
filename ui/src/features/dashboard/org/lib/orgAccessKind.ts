import type { OrgAccessKind } from '@/features/dashboard/team/lib/orgPermissions';

export function isPropertyOnlyOrgAccess(accessKind: OrgAccessKind | undefined): boolean {
  return accessKind === 'property_member';
}

export function canSelectOrgInSwitcher(accessKind: OrgAccessKind | undefined): boolean {
  return Boolean(accessKind && !isPropertyOnlyOrgAccess(accessKind));
}

/** Owner (and platform admin) may create properties; org ADMIN does not. */
export function canCreatePropertiesInOrg(accessKind: OrgAccessKind | undefined): boolean {
  return accessKind === 'owner' || accessKind === 'platform_admin';
}

export function canCreateParkingsInOrg(accessKind: OrgAccessKind | undefined): boolean {
  return accessKind === 'owner' || accessKind === 'platform_admin';
}

/** Org owner (or platform admin) may start checkout or confirm a downgrade. */
export function canManageOrgBilling(accessKind: OrgAccessKind | undefined): boolean {
  return accessKind === 'owner' || accessKind === 'platform_admin';
}
