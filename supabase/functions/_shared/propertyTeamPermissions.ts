/**
 * Property team RBAC — server-side contract (mirrors ui/.../propertyTeamConstants.ts).
 *
 * Standard roles: MANAGER | STAFF | VIEWER
 * Custom roles: property_custom_roles.id (UUID string on member/invite rows)
 * Permission overrides: JSONB array on property_members / property_invitations
 *
 * Org owner, org ADMIN, and platform admin: implicit full access (no property_members row).
 */

export const BUILTIN_PROPERTY_ROLES = ['MANAGER', 'STAFF', 'VIEWER'] as const;
export type BuiltinPropertyRole = (typeof BUILTIN_PROPERTY_ROLES)[number];

export const PROPERTY_INVITE_TTL_DAYS = 7;

/** Canonical permission ids — keep in sync with ui/src/features/team/lib/propertyTeamConstants.ts */
export const TEAM_PERMISSION_IDS = [
  'bookings:view',
  'bookings:edit',
  'bookings:workflow',
  'finance:view',
  'finance:edit',
  'pricing:view',
  'pricing:edit',
  'maintenance:view',
  'maintenance:edit',
  'notifications:view',
  'notifications:edit',
  'templates:view',
  'templates:edit',
  'settings:view',
  'settings:edit',
  'team:view',
  'team:invite',
  'team:manage',
] as const;

export type TeamPermissionId = (typeof TEAM_PERMISSION_IDS)[number];

const TEAM_PERMISSION_ID_SET = new Set<string>(TEAM_PERMISSION_IDS);

/** Invite email copy — keep aligned with ui/.../propertyTeamConstants.ts role intent. */
export const BUILTIN_ROLE_EMAIL_DESCRIPTIONS: Record<BuiltinPropertyRole, string> = {
  MANAGER:
    'Managers have full access to this property, including bookings, finance, settings, and team management.',
  STAFF: 'Staff can manage bookings, workflow, and maintenance for this property.',
  VIEWER: 'Viewers have read-only access to this property.',
};

/** Default presets per built-in role. */
export const BUILTIN_ROLE_PERMISSIONS: Record<BuiltinPropertyRole, TeamPermissionId[]> = {
  MANAGER: [...TEAM_PERMISSION_IDS],
  STAFF: [
    'bookings:view',
    'bookings:edit',
    'bookings:workflow',
    'maintenance:view',
    'maintenance:edit',
    'notifications:view',
    'templates:view',
    'pricing:view',
  ],
  VIEWER: [
    'bookings:view',
    'maintenance:view',
    'notifications:view',
    'templates:view',
    'pricing:view',
    'team:view',
  ],
};

export type PropertyCustomRoleRow = {
  id: string;
  property_id: string;
  name: string;
  permissions: string[];
};

export type PropertyMemberRow = {
  id: string;
  property_id: string;
  user_id: string;
  role_id: string;
  permissions: string[];
  saved_permissions: string[] | null;
  status: 'active' | 'inactive';
  invited_by: string | null;
  assigned_at: string;
  last_active_at: string | null;
};

export type PropertyInvitationRow = {
  id: string;
  property_id: string;
  email: string;
  role_id: string;
  permissions: string[];
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  sent_by: string;
  sent_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBuiltinPropertyRole(roleId: string): roleId is BuiltinPropertyRole {
  return (BUILTIN_PROPERTY_ROLES as readonly string[]).includes(roleId);
}

export function isCustomRoleId(roleId: string): boolean {
  return UUID_RE.test(roleId);
}

export function assertValidRoleId(roleId: string): void {
  if (isBuiltinPropertyRole(roleId) || isCustomRoleId(roleId)) return;
  throw new Error(`Invalid role_id: ${roleId}`);
}

/** Any subset of the catalog (supports granting beyond role preset). */
export function normalizePermissionIds(raw: unknown): TeamPermissionId[] {
  if (!Array.isArray(raw)) return [];
  const out: TeamPermissionId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!TEAM_PERMISSION_ID_SET.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id as TeamPermissionId);
  }
  return out;
}

export function permissionsInclude(
  granted: readonly string[],
  required: TeamPermissionId
): boolean {
  return granted.includes(required);
}

export function hasPropertyPermission(
  granted: readonly string[],
  required: TeamPermissionId
): boolean {
  return permissionsInclude(granted, required);
}

export function allTeamPermissions(): TeamPermissionId[] {
  return [...TEAM_PERMISSION_IDS];
}

export function builtinRolePreset(roleId: BuiltinPropertyRole): TeamPermissionId[] {
  return [...BUILTIN_ROLE_PERMISSIONS[roleId]];
}

export function resolvePresetPermissions(
  roleId: string,
  customRolesById: Map<string, PropertyCustomRoleRow>
): TeamPermissionId[] {
  if (isBuiltinPropertyRole(roleId)) {
    return builtinRolePreset(roleId);
  }
  const custom = customRolesById.get(roleId);
  return normalizePermissionIds(custom?.permissions ?? []);
}

/**
 * Effective permissions for an active member row.
 * Inactive members must not receive API access — caller checks status first.
 */
export function effectiveMemberPermissions(
  member: Pick<PropertyMemberRow, 'permissions' | 'status'>
): TeamPermissionId[] {
  if (member.status !== 'active') return [];
  const stored = normalizePermissionIds(member.permissions);
  return stored.length > 0 ? stored : [];
}

/** Preset for new invite/member when client omits explicit permissions. */
export function defaultPermissionsForRole(
  roleId: string,
  customRolesById: Map<string, PropertyCustomRoleRow>
): TeamPermissionId[] {
  assertValidRoleId(roleId);
  return resolvePresetPermissions(roleId, customRolesById);
}

/** Team API gates (Manager preset includes both). */
export const TEAM_API_PERMISSIONS = {
  listMembers: 'team:view',
  listInvitations: 'team:view',
  listCustomRoles: 'team:view',
  inviteMember: 'team:invite',
  resendInvitation: 'team:invite',
  cancelInvitation: 'team:invite',
  updateMember: 'team:manage',
  removeMember: 'team:manage',
  createCustomRole: 'team:manage',
  updateCustomRole: 'team:manage',
  deleteCustomRole: 'team:manage',
} as const satisfies Record<string, TeamPermissionId>;

export function inviteExpiresAt(from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + PROPERTY_INVITE_TTL_DAYS);
  return d;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}
