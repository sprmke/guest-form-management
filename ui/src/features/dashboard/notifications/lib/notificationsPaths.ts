import { useNotificationsOrgScope } from '@/features/dashboard/notifications/lib/notificationsScope';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import {
  bookingDetailPath,
  getLastParkingSlug,
  getLastPropertySlug,
  getLastTenantKind,
  parkingBookingDetailPath,
  parkingInboxPath,
  parkingNotificationsPath,
  propertyInboxPath,
  propertyNotificationsPath,
} from '@/features/dashboard/org/lib/tenantPaths';

type NotificationLike = {
  booking_id: string | null;
  conversation_id: string | null;
  property_id: string | null;
  parking_id: string | null;
};

export type NotificationPathScope = {
  orgSlug: string | null;
  propertySlugById: Map<string, string>;
  parkingSlugById: Map<string, string>;
};

/** Click-through destination for a notification, or null when it can't be resolved yet. */
export function resolveNotificationPath(
  notification: NotificationLike,
  { orgSlug, propertySlugById, parkingSlugById }: NotificationPathScope
): string | null {
  if (!orgSlug) return null;

  if (notification.booking_id && notification.property_id) {
    const slug = propertySlugById.get(notification.property_id);
    if (slug) return bookingDetailPath(orgSlug, slug, notification.booking_id);
  }

  if (notification.booking_id && notification.parking_id) {
    const slug = parkingSlugById.get(notification.parking_id);
    if (slug) return parkingBookingDetailPath(orgSlug, slug, notification.booking_id);
  }

  if (notification.conversation_id && notification.property_id) {
    const slug = propertySlugById.get(notification.property_id);
    if (slug) return propertyInboxPath(orgSlug, slug);
  }

  if (notification.conversation_id && notification.parking_id) {
    const slug = parkingSlugById.get(notification.parking_id);
    if (slug) return parkingInboxPath(orgSlug, slug);
  }

  return null;
}

/** In-app activity section anchor on the Notifications hub page. */
export const IN_APP_NOTIFICATIONS_SECTION_ID = 'activity';

/** Sidebar / main-content group label for the in-app feed block. */
export const IN_APP_NOTIFICATIONS_NAV_GROUP_LABEL = 'In-app notifications';

export function notificationsHubActivityHash(): string {
  return `#section-${IN_APP_NOTIFICATIONS_SECTION_ID}`;
}

/** Notifications settings + in-app activity feed for the current tenant scope. */
export function useNotificationsHubPath(): string | null {
  const tenant = useOptionalOrgContext();
  const parkingTenant = useOptionalParkingContext();
  const { orgSlug } = useNotificationsOrgScope();

  if (!orgSlug) return null;

  if (parkingTenant) {
    return parkingNotificationsPath(orgSlug, parkingTenant.parkingSlug);
  }

  if (tenant) {
    return propertyNotificationsPath(orgSlug, tenant.propertySlug);
  }

  const kind = getLastTenantKind();
  if (kind === 'parking') {
    const parkingSlug = getLastParkingSlug();
    if (parkingSlug) return parkingNotificationsPath(orgSlug, parkingSlug);
  }

  const propertySlug = getLastPropertySlug();
  if (propertySlug) return propertyNotificationsPath(orgSlug, propertySlug);

  return null;
}
