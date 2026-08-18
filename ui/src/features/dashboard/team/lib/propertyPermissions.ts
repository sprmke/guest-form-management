import type { TeamPermission } from '@/features/dashboard/team/types/propertyTeam';

export type PropertyAccessKind = 'owner' | 'platform_admin' | 'org_admin' | 'member';

export type PropertyAccessPayload = {
  accessKind: PropertyAccessKind;
  permissions: string[];
  memberId: string | null;
  propertyId: string;
  orgSlug: string;
  propertySlug: string;
  propertyName: string;
};

export type TeamPermissionId = TeamPermission['id'];

export type PropertySection =
  | 'dashboard'
  | 'bookings'
  | 'finance'
  | 'calendar'
  | 'maintenance'
  | 'marketing'
  | 'notifications'
  | 'templates'
  | 'public-pages'
  | 'plans'
  | 'team'
  | 'settings'
  | 'inbox'
  | 'help-support';

export function hasPropertyPermission(
  permissions: readonly string[] | undefined,
  required: TeamPermissionId
): boolean {
  return permissions?.includes(required) ?? false;
}

/** Minimum view permission per property sidebar nav label. */
export const PROPERTY_NAV_VIEW_PERMISSION: Record<string, TeamPermissionId> = {
  Dashboard: 'bookings:view',
  Bookings: 'bookings:view',
  Finance: 'finance:view',
  Calendar: 'pricing:view',
  Maintenance: 'maintenance:view',
  Marketing: 'notifications:view',
  Notifications: 'notifications:view',
  Templates: 'templates:view',
  'Public Pages': 'templates:view',
  Plans: 'settings:view',
  Team: 'team:view',
  Settings: 'settings:view',
  Inbox: 'inbox:view',
};

/** Minimum view permission per property route section. */
export const PROPERTY_SECTION_VIEW_PERMISSION = {
  dashboard: 'bookings:view',
  bookings: 'bookings:view',
  finance: 'finance:view',
  calendar: 'pricing:view',
  maintenance: 'maintenance:view',
  marketing: 'notifications:view',
  notifications: 'notifications:view',
  templates: 'templates:view',
  'public-pages': 'templates:view',
  plans: 'settings:view',
  team: 'team:view',
  settings: 'settings:view',
  inbox: 'inbox:view',
  'help-support': 'bookings:view',
} as const satisfies Record<PropertySection, TeamPermissionId>;
