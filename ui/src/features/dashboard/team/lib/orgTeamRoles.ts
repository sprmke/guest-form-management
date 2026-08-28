import type { CustomPropertyRole } from '@/features/dashboard/team/types/propertyTeam';
import {
  ORG_ROLE_PERMISSIONS,
  ORG_TEAM_PERMISSIONS,
} from '@/features/dashboard/team/lib/orgTeamConstants';
import {
  findOrgTemplateIdByName,
  isSeededOrgTemplateName,
  SEEDED_ORG_TEMPLATE_NAMES,
  sortOrgTemplatesForDisplay,
} from '@/features/dashboard/team/lib/orgTeamTemplates';

export const ORG_CUSTOM_ROLE_COLOR = 'bg-violet-500';
export const ORG_SEEDED_TEMPLATE_COLOR = 'bg-sky-500';

export type CustomOrgRole = CustomPropertyRole;

export function isOrgAdminRoleId(roleId: string): boolean {
  return roleId === 'ADMIN';
}

export function getOrgRoleLabel(roleId: string, customRoles: CustomOrgRole[]): string {
  if (isOrgAdminRoleId(roleId)) return 'Admin';
  return customRoles.find((role) => role.id === roleId)?.name ?? roleId;
}

export function getOrgRoleColor(roleId: string, customRoles: CustomOrgRole[]): string {
  if (isOrgAdminRoleId(roleId)) return 'bg-purple-500';
  const custom = customRoles.find((role) => role.id === roleId);
  if (custom && isSeededOrgTemplateName(custom.name)) return ORG_SEEDED_TEMPLATE_COLOR;
  return ORG_CUSTOM_ROLE_COLOR;
}

export function getOrgRolePermissions(roleId: string, customRoles: CustomOrgRole[]): string[] {
  if (isOrgAdminRoleId(roleId)) return [...ORG_ROLE_PERMISSIONS.ADMIN];
  const custom = customRoles.find((role) => role.id === roleId);
  if (custom) return [...custom.permissions];
  return [];
}

export function defaultOrgInviteTemplateId(customRoles: CustomOrgRole[]): string {
  const operationsId = findOrgTemplateIdByName(customRoles, SEEDED_ORG_TEMPLATE_NAMES.OPERATIONS);
  if (operationsId) return operationsId;
  const sorted = sortOrgTemplatesForDisplay(customRoles);
  if (sorted[0]) return sorted[0].id;
  return 'ADMIN';
}

export function buildOrgTemplateMatrixColumns(customRoles: CustomOrgRole[]) {
  return sortOrgTemplatesForDisplay(customRoles).map((role) => ({
    id: role.id,
    label: role.name,
    color: isSeededOrgTemplateName(role.name) ? ORG_SEEDED_TEMPLATE_COLOR : ORG_CUSTOM_ROLE_COLOR,
    permissions: role.permissions,
    isCustom: true,
  }));
}

export function countOrgMembersWithTemplateRole(
  roleId: string,
  members: { role: string; isOwner?: boolean }[],
  invitations: { role: string }[]
): number {
  return (
    members.filter((member) => !member.isOwner && member.role === roleId).length +
    invitations.filter((invitation) => invitation.role === roleId).length
  );
}

export { ORG_TEAM_PERMISSIONS };
