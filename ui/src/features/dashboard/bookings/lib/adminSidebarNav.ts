import type { ComponentType } from 'react';

import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Car,
  ClipboardCheck,
  DollarSign,
  FileText,
  HelpCircle,
  Inbox,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Settings,
  Tags,
  Users,
  Wrench,
} from 'lucide-react';

import {
  orgBookingsPath,
  orgDashboardPath,
  orgInboxPath,
  orgParkingsPath,
  orgPropertiesPath,
  orgSettingsPath,
  orgTeamPath,
  parkingSectionPath,
  propertySectionPath,
} from '@/features/dashboard/org/lib/tenantPaths';
import { superAdminPaths } from '@/features/dashboard/super-admin/lib/superAdminPaths';
import type { OrgPermissionId } from '@/features/dashboard/team/lib/orgPermissions';
import {
  hasOrgPermission,
  ORG_NAV_VIEW_PERMISSION,
} from '@/features/dashboard/team/lib/orgPermissions';
import {
  hasParkingPermission,
  PARKING_NAV_VIEW_PERMISSION,
} from '@/features/dashboard/team/lib/parkingPermissions';
import {
  hasPropertyPermission,
  PROPERTY_NAV_VIEW_PERMISSION,
} from '@/features/dashboard/team/lib/propertyPermissions';

export type SidebarNavItem = {
  label: string;
  href?: string;
  Icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

export type SidebarNavSection = {
  label: string;
  items: SidebarNavItem[];
};

/** Organization context — mirrors property-management-app org nav. */
export function buildOrgNavSections(
  orgSlug: string,
  options?: { showProperties?: boolean; showParkings?: boolean }
): SidebarNavSection[] {
  const showProperties = options?.showProperties !== false;
  const showParkings = options?.showParkings !== false;

  const items: SidebarNavItem[] = [
    {
      label: 'Dashboard',
      href: orgDashboardPath(orgSlug),
      Icon: LayoutDashboard,
    },
    {
      label: 'Bookings',
      href: orgBookingsPath(orgSlug),
      Icon: BookOpen,
    },
  ];

  if (showProperties) {
    items.push({
      label: 'Properties',
      href: orgPropertiesPath(orgSlug),
      Icon: Building2,
    });
  }

  if (showParkings) {
    items.push({
      label: 'Parkings',
      href: orgParkingsPath(orgSlug),
      Icon: Car,
    });
  }

  items.push(
    {
      label: 'Team',
      href: orgTeamPath(orgSlug),
      Icon: Users,
    },
    {
      label: 'Inbox',
      href: orgInboxPath(orgSlug),
      Icon: Inbox,
    },
    {
      label: 'Settings',
      href: orgSettingsPath(orgSlug),
      Icon: Settings,
    },
    { label: 'Help & Support', Icon: HelpCircle, disabled: true }
  );

  return [{ label: 'Org', items }];
}

/** Property context — guest-form operational sections. */
export function buildPropertyNavSections(
  orgSlug: string,
  propertySlug: string
): SidebarNavSection[] {
  return [
    {
      label: 'Property',
      items: [
        {
          label: 'Dashboard',
          href: propertySectionPath(orgSlug, propertySlug, 'dashboard'),
          Icon: LayoutDashboard,
        },
        {
          label: 'Bookings',
          href: propertySectionPath(orgSlug, propertySlug, 'bookings'),
          Icon: BookOpen,
        },
        {
          label: 'Finance',
          href: propertySectionPath(orgSlug, propertySlug, 'finance'),
          Icon: DollarSign,
        },
        {
          label: 'Maintenance',
          href: propertySectionPath(orgSlug, propertySlug, 'maintenance'),
          Icon: Wrench,
        },
        {
          label: 'Calendar',
          href: propertySectionPath(orgSlug, propertySlug, 'calendar'),
          Icon: CalendarDays,
        },
        {
          label: 'Team',
          href: propertySectionPath(orgSlug, propertySlug, 'team'),
          Icon: Users,
        },
        {
          label: 'Marketing',
          href: propertySectionPath(orgSlug, propertySlug, 'marketing'),
          Icon: Megaphone,
        },
        {
          label: 'Inbox',
          href: propertySectionPath(orgSlug, propertySlug, 'inbox'),
          Icon: Inbox,
        },
        {
          label: 'Notifications',
          href: propertySectionPath(orgSlug, propertySlug, 'notifications'),
          Icon: Bell,
        },
        {
          label: 'Templates',
          href: propertySectionPath(orgSlug, propertySlug, 'templates'),
          Icon: FileText,
        },
        {
          label: 'Settings',
          href: propertySectionPath(orgSlug, propertySlug, 'settings'),
          Icon: Settings,
        },
        { label: 'Help & Support', Icon: HelpCircle, disabled: true },
      ],
    },
  ];
}

/** Parking context — operational sections for a parking slot. */
export function buildParkingNavSections(orgSlug: string, parkingSlug: string): SidebarNavSection[] {
  return [
    {
      label: 'Parking',
      items: [
        {
          label: 'Dashboard',
          href: parkingSectionPath(orgSlug, parkingSlug, 'dashboard'),
          Icon: LayoutDashboard,
        },
        {
          label: 'Bookings',
          href: parkingSectionPath(orgSlug, parkingSlug, 'bookings'),
          Icon: BookOpen,
        },
        {
          label: 'Finance',
          href: parkingSectionPath(orgSlug, parkingSlug, 'finance'),
          Icon: DollarSign,
        },
        {
          label: 'Pricing',
          href: parkingSectionPath(orgSlug, parkingSlug, 'pricing'),
          Icon: Tags,
        },
        {
          label: 'Team',
          href: parkingSectionPath(orgSlug, parkingSlug, 'team'),
          Icon: Users,
        },
        {
          label: 'Inbox',
          href: parkingSectionPath(orgSlug, parkingSlug, 'inbox'),
          Icon: Inbox,
        },
        {
          label: 'Notifications',
          href: parkingSectionPath(orgSlug, parkingSlug, 'notifications'),
          Icon: Bell,
        },
        {
          label: 'Settings',
          href: parkingSectionPath(orgSlug, parkingSlug, 'settings'),
          Icon: Settings,
        },
        { label: 'Help & Support', Icon: HelpCircle, disabled: true },
      ],
    },
  ];
}

/** Hide org nav items the current user cannot view. */
export function filterOrgNavSections(
  sections: SidebarNavSection[],
  permissions: readonly string[] | undefined
): SidebarNavSection[] {
  const granted = permissions ?? [];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.disabled || !item.href) return true;
        const required = ORG_NAV_VIEW_PERMISSION[item.label];
        if (!required) return true;
        return hasOrgPermission(granted, required);
      }),
    }))
    .filter((section) => section.items.some((item) => item.href || item.disabled));
}

/** Hide property nav items the current user cannot view. */
export function filterPropertyNavSections(
  sections: SidebarNavSection[],
  permissions: readonly string[] | undefined
): SidebarNavSection[] {
  const granted = permissions ?? [];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.disabled || !item.href) return true;
        if (item.label === 'Calendar') {
          return (
            hasPropertyPermission(granted, 'pricing:view') ||
            hasPropertyPermission(granted, 'bookings:view')
          );
        }
        const required = PROPERTY_NAV_VIEW_PERMISSION[item.label];
        if (!required) return true;
        return hasPropertyPermission(granted, required);
      }),
    }))
    .filter((section) => section.items.some((item) => item.href || item.disabled));
}

const LEGACY_PARKING_NAV_VIEW_PERMISSION: Record<string, OrgPermissionId> = {
  Dashboard: 'org:parkings:view',
  Bookings: 'org:parkings:view',
  Finance: 'org:parkings:view',
  Pricing: 'org:parkings:view',
  Notifications: 'org:parkings:view',
  Settings: 'org:parkings:manage',
};

/** Hide parking nav items using parking-scoped team permissions. */
export function filterParkingNavSections(
  sections: SidebarNavSection[],
  permissions: readonly string[] | undefined
): SidebarNavSection[] {
  const granted = permissions ?? [];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.disabled || !item.href) return true;
        const parkingRequired = PARKING_NAV_VIEW_PERMISSION[item.label];
        if (parkingRequired) {
          return hasParkingPermission(granted, parkingRequired);
        }
        const orgRequired = LEGACY_PARKING_NAV_VIEW_PERMISSION[item.label];
        if (!orgRequired) return true;
        return hasOrgPermission(granted, orgRequired);
      }),
    }))
    .filter((section) => section.items.some((item) => item.href || item.disabled));
}

export const LEGACY_NAV_SECTIONS: SidebarNavSection[] = [
  {
    label: 'Legacy',
    items: [
      { label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
      { label: 'Bookings', href: '/bookings', Icon: BookOpen },
      { label: 'Finance', href: '/finance', Icon: DollarSign },
      { label: 'Maintenance', href: '/maintenance', Icon: Wrench },
      { label: 'Notifications', href: '/notifications', Icon: Bell },
      { label: 'Settings', href: '/settings', Icon: Settings },
    ],
  },
];

/** Super-admin platform nav — org-scoped items are added when an org is selected. */
export function buildSuperAdminNavSections(orgSlug: string | null): SidebarNavSection[] {
  const sections: SidebarNavSection[] = [
    {
      label: 'Platform',
      items: [
        { label: 'Overview', href: superAdminPaths.root, Icon: LayoutDashboard },
        { label: 'Developments', href: superAdminPaths.developments, Icon: Landmark },
        { label: 'Properties', href: superAdminPaths.properties, Icon: Building2 },
        { label: 'Approvals', href: superAdminPaths.approvals, Icon: ClipboardCheck },
        { label: 'Hosts', href: superAdminPaths.hosts, Icon: Users },
      ],
    },
  ];

  if (orgSlug) {
    sections.push({
      label: 'Organization',
      items: [
        {
          label: 'Properties',
          href: superAdminPaths.orgProperties(orgSlug),
          Icon: Building2,
        },
      ],
    });
  }

  return sections;
}

export function isSuperAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isPropertyAdminPath(pathname: string): boolean {
  return /\/org\/[^/]+\/property\/[^/]+/.test(pathname);
}

export function isParkingAdminPath(pathname: string): boolean {
  return /\/org\/[^/]+\/parking\/[^/]+/.test(pathname);
}

export function isOrgAdminPath(pathname: string): boolean {
  return (
    /\/org\/[^/]+/.test(pathname) && !isPropertyAdminPath(pathname) && !isParkingAdminPath(pathname)
  );
}
