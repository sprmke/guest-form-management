import {
  type BuiltinOrgRole,
  ORG_ROLE_PERMISSIONS,
  ORG_ROLES,
  orgRoleConfig,
} from '@/features/dashboard/team/lib/orgTeamConstants';
import type { OrgRoleId } from '@/features/dashboard/team/types/orgTeam';

export type OrgRoleMatrixColumn = {
  id: OrgRoleId;
  label: string;
  color: string;
  permissions: string[];
};

export function buildOrgRoleMatrixColumns(): OrgRoleMatrixColumn[] {
  return ORG_ROLES.map((role) => ({
    id: role.value,
    label: role.label,
    color: role.color,
    permissions: ORG_ROLE_PERMISSIONS[role.value],
  }));
}

export function getOrgRolePermissions(roleId: OrgRoleId): string[] {
  if (roleId === 'OWNER' || roleId === 'ADMIN') {
    return [...ORG_ROLE_PERMISSIONS[roleId]];
  }
  return [];
}

export function countOrgMembersWithRole(
  roleId: OrgRoleId,
  members: { role: OrgRoleId; isOwner?: boolean }[],
  invitations: { role: OrgRoleId }[]
): number {
  if (roleId === 'OWNER') {
    return members.filter((m) => m.isOwner || m.role === 'OWNER').length;
  }
  return (
    members.filter((m) => m.role === roleId && !m.isOwner).length +
    invitations.filter((i) => i.role === roleId).length
  );
}

export function isBuiltinOrgRoleId(roleId: string): roleId is BuiltinOrgRole {
  return roleId === 'OWNER' || roleId === 'ADMIN';
}

export function orgRoleLabel(roleId: OrgRoleId): string {
  return orgRoleConfig(roleId)?.label ?? roleId;
}
