import {
  PARKING_PERMISSION_CATEGORIES,
  PARKING_ROLE_PERMISSIONS,
  PARKING_ROLES,
  PARKING_TEAM_PERMISSIONS,
} from '@/features/dashboard/team/lib/parkingTeamConstants';
import {
  PERMISSION_CATEGORIES,
  PROPERTY_ROLES,
  ROLE_PERMISSIONS,
  TEAM_PERMISSIONS,
} from '@/features/dashboard/team/lib/propertyTeamConstants';
import type { TeamPermission } from '@/features/dashboard/team/types/propertyTeam';

export type TeamScope = 'property' | 'parking';

export type BuiltinRoleOption = {
  value: string;
  label: string;
  description: string;
  color: string;
};

export type TeamScopeConfig = {
  scope: TeamScope;
  permissions: TeamPermission[];
  categories: string[];
  builtinRoles: BuiltinRoleOption[];
  rolePermissions: Record<string, string[]>;
  removeFromLabel: string;
  subtitle: string;
};

export function getTeamScopeConfig(scope: TeamScope): TeamScopeConfig {
  if (scope === 'parking') {
    return {
      scope: 'parking',
      permissions: PARKING_TEAM_PERMISSIONS,
      categories: PARKING_PERMISSION_CATEGORIES,
      builtinRoles: PARKING_ROLES,
      rolePermissions: PARKING_ROLE_PERMISSIONS,
      removeFromLabel: 'Remove from Parking',
      subtitle: "Manage your parking slot's team members and permissions.",
    };
  }

  return {
    scope: 'property',
    permissions: TEAM_PERMISSIONS,
    categories: PERMISSION_CATEGORIES,
    builtinRoles: PROPERTY_ROLES,
    rolePermissions: ROLE_PERMISSIONS,
    removeFromLabel: 'Remove from Property',
    subtitle: "Manage your property's team members and permissions.",
  };
}
