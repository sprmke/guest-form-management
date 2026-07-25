/** Property-scoped public guest URLs (`/properties/:propertySlug/...`). */

import { formatDateToYYYYMMDD } from '@/utils/format/dates';

function propertyBase(propertySlug: string): string {
  const slug = propertySlug.trim();
  if (!slug) return '/properties';
  return `/properties/${encodeURIComponent(slug)}`;
}

function withQuery(path: string, search?: URLSearchParams | string): string {
  if (!search) return path;
  const qs = search instanceof URLSearchParams ? search.toString() : search.trim();
  return qs ? `${path}?${qs}` : path;
}

export function guestCalendarPath(propertySlug: string, search?: URLSearchParams | string): string {
  return withQuery(`${propertyBase(propertySlug)}/calendar`, search);
}

/** Public marketing listing page (`/properties/:propertySlug`). */
export function guestPropertyPath(propertySlug: string): string {
  return propertyBase(propertySlug);
}

/** Open the property page date picker (`pickDates=contactHost` | `pickDates=reserve`). */
export function guestPropertyPickDatesPath(
  propertySlug: string,
  intent: 'contactHost' | 'reserve' = 'contactHost'
): string {
  const params = new URLSearchParams();
  params.set('pickDates', intent);
  return withQuery(guestPropertyPath(propertySlug), params);
}

/** Re-open Contact host sheet after OAuth (`contactHost=open`; dates optional). */
export function guestPropertyContactHostOpenPath(
  propertySlug: string,
  checkInDate?: string,
  checkOutDate?: string
): string {
  const params = new URLSearchParams();
  params.set('contactHost', 'open');
  const inDate = checkInDate?.trim() ?? '';
  const outDate = checkOutDate?.trim() ?? '';
  if (inDate && outDate) {
    params.set('checkInDate', inDate);
    params.set('checkOutDate', outDate);
  }
  return withQuery(guestPropertyPath(propertySlug), params);
}

export function guestFormPath(propertySlug: string, search?: URLSearchParams | string): string {
  return withQuery(`${propertyBase(propertySlug)}/form`, search);
}

export type GuestChatPathOptions = {
  checkIn: Date;
  checkOut: Date;
};

export function guestChatPath(propertySlug: string, options: GuestChatPathOptions): string {
  const params = new URLSearchParams();
  params.set('checkInDate', formatDateToYYYYMMDD(options.checkIn));
  params.set('checkOutDate', formatDateToYYYYMMDD(options.checkOut));
  return withQuery(`${propertyBase(propertySlug)}/messages`, params);
}

export function guestSuccessPath(propertySlug: string, search?: URLSearchParams | string): string {
  return withQuery(`${propertyBase(propertySlug)}/success`, search);
}

export function guestSdFormPath(
  propertySlug: string,
  bookingId: string,
  extra?: URLSearchParams
): string {
  const params = new URLSearchParams(extra);
  params.set('bookingId', bookingId);
  return withQuery(`${propertyBase(propertySlug)}/sd-form`, params);
}

export function guestReviewPath(
  propertySlug: string,
  bookingId: string,
  extra?: URLSearchParams
): string {
  const params = new URLSearchParams(extra);
  params.set('bookingId', bookingId);
  return withQuery(`${propertyBase(propertySlug)}/guest-review`, params);
}

export type GuestPayParkingPathOptions = {
  admin?: boolean;
};

export function guestPayParkingPath(
  propertySlug: string,
  bookingId: string,
  options: GuestPayParkingPathOptions = {}
): string {
  const base = `${propertyBase(propertySlug)}/parking/${encodeURIComponent(bookingId)}`;
  if (options.admin) return `${base}?admin=true`;
  return base;
}

export function guestStayGuidePath(propertySlug: string, token: string): string {
  const params = new URLSearchParams({ token: token.trim() });
  return withQuery(`${propertyBase(propertySlug)}/stay-guide`, params);
}

/** Admin preview — sample booking placeholders; requires signed-in host session on the page. */
export function guestStayGuidePreviewPath(propertySlug: string, propertyId: string): string {
  const params = new URLSearchParams({
    preview: '1',
    property_id: propertyId.trim(),
  });
  return withQuery(`${propertyBase(propertySlug)}/stay-guide`, params);
}

export function absoluteGuestCalendarUrl(propertySlug: string): string {
  if (typeof window === 'undefined') return guestCalendarPath(propertySlug);
  return `${window.location.origin}${guestCalendarPath(propertySlug)}`;
}

export function absoluteGuestPropertyUrl(propertySlug: string): string {
  if (typeof window === 'undefined') return guestPropertyPath(propertySlug);
  return `${window.location.origin}${guestPropertyPath(propertySlug)}`;
}

export function guestParkingPath(parkingSlug: string): string {
  const slug = parkingSlug.trim();
  if (!slug) return '/parkings';
  return `/parkings/${encodeURIComponent(slug)}`;
}

export function guestParkingFormPath(
  parkingSlug: string,
  search?: URLSearchParams | string
): string {
  const slug = parkingSlug.trim();
  if (!slug) return '/parkings';
  return withQuery(`${guestParkingPath(slug)}/form`, search);
}

export function absoluteGuestParkingUrl(parkingSlug: string): string {
  if (typeof window === 'undefined') return guestParkingPath(parkingSlug);
  return `${window.location.origin}${guestParkingPath(parkingSlug)}`;
}

export function absoluteGuestParkingFormUrl(parkingSlug: string): string {
  if (typeof window === 'undefined') return guestParkingFormPath(parkingSlug);
  return `${window.location.origin}${guestParkingFormPath(parkingSlug)}`;
}

export function absoluteGuestFormUrl(propertySlug: string): string {
  if (typeof window === 'undefined') return guestFormPath(propertySlug);
  return `${window.location.origin}${guestFormPath(propertySlug)}`;
}

/** Public host (organization) profile — guest marketing. Prefer over `/orgs/` (admin uses `/org/`). */
export function guestHostPath(orgSlug: string): string {
  const slug = orgSlug.trim();
  if (!slug) return '/properties';
  return `/hosts/${encodeURIComponent(slug)}`;
}

/** Origin-prefixed prefix for read-only slug fields (property public listing). */
export function publicPropertySlugUrlPrefix(): string {
  if (typeof window === 'undefined') return '/properties/';
  return `${window.location.origin}/properties/`;
}

/** Origin-prefixed prefix for read-only slug fields (host public profile). */
export function publicHostSlugUrlPrefix(): string {
  if (typeof window === 'undefined') return '/hosts/';
  return `${window.location.origin}/hosts/`;
}
