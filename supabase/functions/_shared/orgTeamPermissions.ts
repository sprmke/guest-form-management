/**
 * Org team roles — server contract (mirrors ui/.../orgTeamConstants.ts).
 *
 * Standard roles: OWNER (virtual via organizations.owner_id) | ADMIN (organization_members)
 */

export const BUILTIN_ORG_ROLES = ['OWNER', 'ADMIN'] as const;
export type BuiltinOrgRole = (typeof BUILTIN_ORG_ROLES)[number];

export const ORG_INVITE_TTL_DAYS = 7;

/** Canonical org permission ids — keep in sync with ui/.../orgTeamConstants.ts */
export const ORG_PERMISSION_IDS = [
  'org:dashboard:view',
  'org:bookings:view',
  'org:properties:view',
  'org:properties:create',
  'org:properties:manage',
  'org:parkings:view',
  'org:parkings:create',
  'org:parkings:manage',
  'org:settings:view',
  'org:settings:edit',
  'org:delete',
  'org:team:view',
  'org:team:invite',
  'org:team:manage',
  'org:inbox:view',
  'org:inbox:reply',
  'org:inbox:manage',
] as const;

export type OrgPermissionId = (typeof ORG_PERMISSION_IDS)[number];

const ORG_PERMISSION_ID_SET = new Set<string>(ORG_PERMISSION_IDS);

/** Default presets per built-in org role. */
export const ORG_ROLE_PERMISSIONS: Record<BuiltinOrgRole, OrgPermissionId[]> = {
  OWNER: [...ORG_PERMISSION_IDS],
  ADMIN: [
    'org:dashboard:view',
    'org:bookings:view',
    'org:properties:view',
    'org:properties:manage',
    'org:parkings:view',
    'org:parkings:manage',
    'org:team:view',
    'org:team:invite',
    'org:team:manage',
    'org:inbox:view',
    'org:inbox:reply',
  ],
};

/** Property-only members have no org-scoped screens (property routes only). */
export const ORG_PROPERTY_MEMBER_PERMISSIONS: OrgPermissionId[] = [];

export function allOrgPermissions(): OrgPermissionId[] {
  return [...ORG_PERMISSION_IDS];
}

export function hasOrgPermission(granted: readonly string[], required: OrgPermissionId): boolean {
  return granted.includes(required);
}

export function assertValidOrgRoleId(roleId: string): void {
  if (roleId !== 'ADMIN') {
    throw new Error('Invalid org role');
  }
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ORG_INVITE_TTL_DAYS);
  return d;
}

export function virtualOrgOwnerMemberId(ownerId: string): string {
  return `org-owner-${ownerId}`;
}
