import {
  PROPERTY_ROLES,
  ROLE_PERMISSIONS,
  roleConfig,
} from '@/features/dashboard/team/lib/propertyTeamConstants';
import type {
  BuiltinPropertyRole,
  CustomPropertyRole,
  PropertyRoleId,
} from '@/features/dashboard/team/types/propertyTeam';

export const CUSTOM_ROLE_COLOR = 'bg-violet-500';

export const BUILTIN_ROLE_IDS: BuiltinPropertyRole[] = ['MANAGER', 'STAFF', 'VIEWER'];

export function isBuiltinRoleId(roleId: PropertyRoleId): roleId is BuiltinPropertyRole {
  return BUILTIN_ROLE_IDS.includes(roleId as BuiltinPropertyRole);
}

export function createCustomRoleId() {
  return `custom-${Date.now()}`;
}

export function getRoleLabel(roleId: PropertyRoleId, customRoles: CustomPropertyRole[]): string {
  if (isBuiltinRoleId(roleId)) {
    return roleConfig(roleId)?.label ?? roleId;
  }
  return customRoles.find((r) => r.id === roleId)?.name ?? 'Custom';
}

export function getRoleColor(roleId: PropertyRoleId, _customRoles: CustomPropertyRole[]): string {
  if (isBuiltinRoleId(roleId)) {
    return roleConfig(roleId)?.color ?? CUSTOM_ROLE_COLOR;
  }
  return CUSTOM_ROLE_COLOR;
}

export function getRolePermissions(
  roleId: PropertyRoleId,
  customRoles: CustomPropertyRole[]
): string[] {
  if (isBuiltinRoleId(roleId)) {
    return [...ROLE_PERMISSIONS[roleId]];
  }
  const custom = customRoles.find((r) => r.id === roleId);
  return custom ? [...custom.permissions] : [];
}

export type RoleMatrixColumn = {
  id: PropertyRoleId;
  label: string;
  color: string;
  permissions: string[];
  isCustom: boolean;
};

export function buildRoleMatrixColumns(customRoles: CustomPropertyRole[]): RoleMatrixColumn[] {
  const builtIn = PROPERTY_ROLES.map((role) => ({
    id: role.value,
    label: role.label,
    color: role.color,
    permissions: ROLE_PERMISSIONS[role.value],
    isCustom: false,
  }));

  const custom = customRoles.map((role) => ({
    id: role.id,
    label: role.name,
    color: CUSTOM_ROLE_COLOR,
    permissions: role.permissions,
    isCustom: true,
  }));

  return [...builtIn, ...custom];
}

export function countMembersWithRole(
  roleId: PropertyRoleId,
  members: { role: PropertyRoleId }[],
  invitations: { role: PropertyRoleId }[]
): number {
  return (
    members.filter((m) => m.role === roleId).length +
    invitations.filter((i) => i.role === roleId).length
  );
}
