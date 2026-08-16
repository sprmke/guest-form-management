import { type ORG_ROLE_PERMISSIONS } from '@/features/dashboard/team/lib/orgTeamConstants';

export type OrgAccessKind = 'owner' | 'platform_admin' | 'org_admin' | 'property_member';

export type OrgPermissionId = (typeof ORG_ROLE_PERMISSIONS.OWNER)[number];

export type OrgAccessPayload = {
  accessKind: OrgAccessKind;
  permissions: string[];
  memberId: string | null;
  canListAllProperties: boolean;
  orgId: string;
  orgSlug: string;
  orgName: string;
  canManageTeam: boolean;
  canInviteTeam: boolean;
  canCreateProperties: boolean;
  canManageProperties: boolean;
  canCreateParkings: boolean;
  canManageParkings: boolean;
  canEditSettings: boolean;
};

export function hasOrgPermission(
  permissions: readonly string[] | undefined,
  required: OrgPermissionId
): boolean {
  return permissions?.includes(required) ?? false;
}

/** Minimum view permission per org sidebar nav label. */
export const ORG_NAV_VIEW_PERMISSION: Record<string, OrgPermissionId> = {
  Dashboard: 'org:dashboard:view',
  Bookings: 'org:bookings:view',
  Properties: 'org:properties:view',
  Parkings: 'org:parkings:view',
  Team: 'org:team:view',
  Settings: 'org:settings:view',
};

/** Minimum view permission per org route section. */
export const ORG_SECTION_VIEW_PERMISSION = {
  dashboard: 'org:dashboard:view',
  bookings: 'org:bookings:view',
  properties: 'org:properties:view',
  parkings: 'org:parkings:view',
  team: 'org:team:view',
  settings: 'org:settings:view',
} as const satisfies Record<string, OrgPermissionId>;

export type OrgSection = keyof typeof ORG_SECTION_VIEW_PERMISSION;

export function orgSectionPath(orgSlug: string, section: OrgSection): string {
  switch (section) {
    case 'dashboard':
      return `/org/${orgSlug}/dashboard`;
    case 'bookings':
      return `/org/${orgSlug}/bookings`;
    case 'properties':
      return `/org/${orgSlug}/properties`;
    case 'parkings':
      return `/org/${orgSlug}/parkings`;
    case 'team':
      return `/org/${orgSlug}/team`;
    case 'settings':
      return `/org/${orgSlug}/settings`;
  }
}

/** True when the user may open org-scoped routes (not property-only membership). */
export function canAccessOrgScope(
  access: Pick<OrgAccessPayload, 'accessKind'> | null | undefined
): boolean {
  return Boolean(access && access.accessKind !== 'property_member');
}
