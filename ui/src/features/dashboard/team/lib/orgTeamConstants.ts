import {
  BookOpen,
  Building2,
  Crown,
  Inbox,
  LayoutDashboard,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';

import type { TeamPermission } from '@/features/dashboard/team/types/propertyTeam';

export const ORG_ROLES = [
  {
    value: 'OWNER' as const,
    label: 'Owner',
    description: 'Full organization access, including settings, billing, and deletion.',
    color: 'bg-amber-500',
    icon: Crown,
  },
  {
    value: 'ADMIN' as const,
    label: 'Admin',
    description: 'Manage all properties and organization team members.',
    color: 'bg-purple-500',
    icon: Users,
  },
] as const;

export type BuiltinOrgRole = (typeof ORG_ROLES)[number]['value'];

export const ORG_TEAM_PERMISSIONS: TeamPermission[] = [
  {
    id: 'org:dashboard:view',
    name: 'View Dashboard',
    description: 'Access organization dashboard',
    category: 'Organization',
    icon: LayoutDashboard,
  },
  {
    id: 'org:bookings:view',
    name: 'View Bookings',
    description: 'View bookings across all organization properties',
    category: 'Organization',
    icon: BookOpen,
  },
  {
    id: 'org:properties:view',
    name: 'View Properties',
    description: 'View organization property list',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:properties:create',
    name: 'Add Properties',
    description: 'Create new properties in the organization',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:properties:manage',
    name: 'Manage Properties',
    description: 'Edit organization properties',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:parkings:view',
    name: 'View Parkings',
    description: 'View organization parking list',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:parkings:create',
    name: 'Add Parkings',
    description: 'Create new parking slots in the organization',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:parkings:manage',
    name: 'Manage Parkings',
    description: 'Edit organization parking slots',
    category: 'Organization',
    icon: Building2,
  },
  {
    id: 'org:settings:view',
    name: 'View Org Settings',
    description: 'View organization profile and branding',
    category: 'Organization',
    icon: Settings,
  },
  {
    id: 'org:settings:edit',
    name: 'Edit Org Settings',
    description: 'Change organization profile and branding',
    category: 'Organization',
    icon: Settings,
  },
  {
    id: 'org:delete',
    name: 'Delete Organization',
    description: 'Danger zone — delete organization',
    category: 'Organization',
    icon: Trash2,
  },
  {
    id: 'org:team:view',
    name: 'View Team',
    description: 'View organization team members',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'org:team:invite',
    name: 'Invite Members',
    description: 'Send organization invitations',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'org:team:manage',
    name: 'Manage Members',
    description: 'Deactivate or remove organization members',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'org:inbox:view',
    name: 'View Inbox',
    description: 'Read guest messages from social channels',
    category: 'Inbox',
    icon: Inbox,
  },
  {
    id: 'org:inbox:reply',
    name: 'Reply in Inbox',
    description: 'Send replies to guest messages',
    category: 'Inbox',
    icon: Inbox,
  },
  {
    id: 'org:inbox:manage',
    name: 'Manage Inbox',
    description: 'Connect channels, templates, and automation',
    category: 'Inbox',
    icon: Inbox,
  },
];

/** Default permission presets per built-in org role. */
export const ORG_ROLE_PERMISSIONS: Record<BuiltinOrgRole, string[]> = {
  OWNER: ORG_TEAM_PERMISSIONS.map((p) => p.id),
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

export const ORG_PERMISSION_CATEGORIES = [...new Set(ORG_TEAM_PERMISSIONS.map((p) => p.category))];

export function orgRoleConfig(role: BuiltinOrgRole) {
  return ORG_ROLES.find((r) => r.value === role);
}

export function getOrgRoleLabel(roleId: string): string {
  return ORG_ROLES.find((role) => role.value === roleId)?.label ?? roleId;
}

export function getOrgRoleColor(roleId: string): string {
  return ORG_ROLES.find((role) => role.value === roleId)?.color ?? 'bg-gray-500';
}
