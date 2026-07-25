import type { PropertySection } from '@/features/dashboard/team/lib/propertyPermissions';

const LAST_ORG_SLUG_KEY = 'kame-last-org-slug';
const LAST_PROPERTY_SLUG_KEY = 'kame-last-property-slug';
const LAST_PARKING_SLUG_KEY = 'kame-last-parking-slug';
const LAST_TENANT_KIND_KEY = 'kame-last-tenant-kind';

export type TenantKind = 'property' | 'parking';

export type ParkingSection =
  'dashboard' | 'bookings' | 'finance' | 'pricing' | 'notifications' | 'team' | 'settings';

export function getLastOrgSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ORG_SLUG_KEY);
}

export function getLastPropertySlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_PROPERTY_SLUG_KEY);
}

export function getLastParkingSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_PARKING_SLUG_KEY);
}

export function getLastTenantKind(): TenantKind | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(LAST_TENANT_KIND_KEY);
  return value === 'property' || value === 'parking' ? value : null;
}

export function setLastTenantContext(orgSlug: string, propertySlug: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ORG_SLUG_KEY, orgSlug);
  localStorage.setItem(LAST_PROPERTY_SLUG_KEY, propertySlug);
  localStorage.setItem(LAST_TENANT_KIND_KEY, 'property');
}

export function setLastParkingContext(orgSlug: string, parkingSlug: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ORG_SLUG_KEY, orgSlug);
  localStorage.setItem(LAST_PARKING_SLUG_KEY, parkingSlug);
  localStorage.setItem(LAST_TENANT_KIND_KEY, 'parking');
}

export function orgBookingsPath(orgSlug: string) {
  return `/org/${orgSlug}/bookings`;
}

export function orgDashboardPath(orgSlug: string) {
  return `/org/${orgSlug}/dashboard`;
}

export function orgPropertiesPath(orgSlug: string) {
  return `/org/${orgSlug}/properties`;
}

export function orgSettingsPath(orgSlug: string) {
  return `/org/${orgSlug}/settings`;
}

export function orgTeamPath(orgSlug: string) {
  return `/org/${orgSlug}/team`;
}

export function orgInboxPath(orgSlug: string) {
  return `/org/${orgSlug}/inbox`;
}

export function orgParkingsPath(orgSlug: string) {
  return `/org/${orgSlug}/parkings`;
}

export function parkingDashboardPath(orgSlug: string, parkingSlug: string) {
  return `/org/${orgSlug}/parking/${parkingSlug}`;
}

export function parkingSectionPath(orgSlug: string, parkingSlug: string, section: ParkingSection) {
  const base = parkingDashboardPath(orgSlug, parkingSlug);
  return section === 'dashboard' ? base : `${base}/${section}`;
}

export function propertyDashboardPath(orgSlug: string, propertySlug: string) {
  return `/org/${orgSlug}/property/${propertySlug}`;
}

export function propertySectionPath(
  orgSlug: string,
  propertySlug: string,
  section: PropertySection
) {
  const base = propertyDashboardPath(orgSlug, propertySlug);
  return section === 'dashboard' ? base : `${base}/${section}`;
}

export type NotificationModule = 'marketing' | 'staff' | 'operations' | 'finance' | 'maintenance';

export function parkingNotificationsPath(
  orgSlug: string,
  parkingSlug: string,
  module?: NotificationModule
) {
  const base = parkingSectionPath(orgSlug, parkingSlug, 'notifications');
  return module ? `${base}?module=${module}` : base;
}

export function propertyNotificationsPath(
  orgSlug: string,
  propertySlug: string,
  module?: NotificationModule
) {
  const base = propertySectionPath(orgSlug, propertySlug, 'notifications');
  return module ? `${base}?module=${module}` : base;
}

export function bookingDetailPath(orgSlug: string, propertySlug: string, bookingId: string) {
  return `${propertyDashboardPath(orgSlug, propertySlug)}/bookings/${bookingId}`;
}
