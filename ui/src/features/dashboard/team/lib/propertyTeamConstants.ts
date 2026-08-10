import {
  Bell,
  BookOpen,
  DollarSign,
  FileText,
  Inbox,
  Settings,
  Tags,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';

import type { PropertyRole, TeamPermission } from '@/features/dashboard/team/types/propertyTeam';

export const PROPERTY_ROLES: {
  value: PropertyRole;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: 'MANAGER',
    label: 'Manager',
    description: 'Full property access (Owner, Property Manager, Sublessor)',
    color: 'bg-red-500',
  },
  {
    value: 'STAFF',
    label: 'Staff',
    description: 'Bookings, workflow, and maintenance',
    color: 'bg-amber-500',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    description: 'Read-only',
    color: 'bg-blue-500',
  },
];

export const TEAM_PERMISSIONS: TeamPermission[] = [
  {
    id: 'bookings:view',
    name: 'View Bookings',
    description: 'View booking list and detail',
    category: 'Bookings',
    icon: BookOpen,
  },
  {
    id: 'bookings:edit',
    name: 'Edit Bookings',
    description: 'Edit guest fields and documents',
    category: 'Bookings',
    icon: BookOpen,
  },
  {
    id: 'bookings:workflow',
    name: 'Run Workflow',
    description: 'Advance booking status and emails',
    category: 'Bookings',
    icon: BookOpen,
  },
  {
    id: 'finance:view',
    name: 'View Finance',
    description: 'View finance dashboard and stays',
    category: 'Finance',
    icon: DollarSign,
  },
  {
    id: 'finance:edit',
    name: 'Edit Finance',
    description: 'Add or edit transactions',
    category: 'Finance',
    icon: DollarSign,
  },
  {
    id: 'pricing:view',
    name: 'View Pricing',
    description: 'View nightly rates and fee defaults',
    category: 'Pricing',
    icon: Tags,
  },
  {
    id: 'pricing:edit',
    name: 'Edit Pricing',
    description: 'Change rates, calendar prices, and fee defaults',
    category: 'Pricing',
    icon: Tags,
  },
  {
    id: 'maintenance:view',
    name: 'View Maintenance',
    description: 'View upkeep reminders',
    category: 'Maintenance',
    icon: Wrench,
  },
  {
    id: 'maintenance:edit',
    name: 'Edit Maintenance',
    description: 'Manage maintenance items',
    category: 'Maintenance',
    icon: Wrench,
  },
  {
    id: 'notifications:view',
    name: 'View Notifications',
    description: 'View Telegram module settings',
    category: 'Notifications',
    icon: Bell,
  },
  {
    id: 'notifications:edit',
    name: 'Edit Notifications',
    description: 'Change Telegram bots and schedules',
    category: 'Notifications',
    icon: Bell,
  },
  {
    id: 'templates:view',
    name: 'View Templates',
    description: 'View email templates',
    category: 'Templates',
    icon: FileText,
  },
  {
    id: 'templates:edit',
    name: 'Edit Templates',
    description: 'Edit property email templates',
    category: 'Templates',
    icon: FileText,
  },
  {
    id: 'settings:view',
    name: 'View Settings',
    description: 'View property settings',
    category: 'Settings',
    icon: Settings,
  },
  {
    id: 'settings:edit',
    name: 'Edit Settings',
    description: 'Change property configuration',
    category: 'Settings',
    icon: Settings,
  },
  {
    id: 'team:view',
    name: 'View Team',
    description: 'View team members',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'team:invite',
    name: 'Invite Members',
    description: 'Send property invitations',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'team:manage',
    name: 'Manage Members',
    description: 'Edit roles and remove members',
    category: 'Team',
    icon: Users,
  },
  {
    id: 'inbox:view',
    name: 'View Inbox',
    description: 'View guest inbox threads',
    category: 'Inbox',
    icon: Inbox,
  },
  {
    id: 'inbox:reply',
    name: 'Reply Inbox',
    description: 'Send replies and AI suggest',
    category: 'Inbox',
    icon: Inbox,
  },
  {
    id: 'inbox:manage',
    name: 'Manage Inbox',
    description: 'Connect channels, quick replies, and automation',
    category: 'Inbox',
    icon: Inbox,
  },
  {
    id: 'import:manage',
    name: 'Manage Imports',
    description: 'Upload and commit CSV booking imports',
    category: 'Bookings',
    icon: Upload,
  },
];

/** Default permission presets per property role (custom overrides allowed on invite/edit). */
export const ROLE_PERMISSIONS: Record<PropertyRole, string[]> = {
  MANAGER: TEAM_PERMISSIONS.map((p) => p.id),
  STAFF: [
    'bookings:view',
    'bookings:edit',
    'bookings:workflow',
    'maintenance:view',
    'maintenance:edit',
    'notifications:view',
    'templates:view',
    'pricing:view',
    'inbox:view',
    'inbox:reply',
  ],
  VIEWER: [
    'bookings:view',
    'maintenance:view',
    'notifications:view',
    'templates:view',
    'pricing:view',
    'team:view',
    'inbox:view',
  ],
};

export const PERMISSION_CATEGORIES = [...new Set(TEAM_PERMISSIONS.map((p) => p.category))];

export function roleConfig(role: PropertyRole) {
  return PROPERTY_ROLES.find((r) => r.value === role);
}
