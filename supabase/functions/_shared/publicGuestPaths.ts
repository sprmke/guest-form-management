/** Property-scoped public guest URLs shared by edge functions and emails. */

export function guestStayGuidePath(origin: string, propertySlug: string, token: string): string {
  const base = origin.replace(/\/+$/, '');
  const slug = propertySlug.trim();
  const t = token.trim();
  if (!slug || !t) return base;
  const params = new URLSearchParams({ token: t });
  return `${base}/properties/${encodeURIComponent(slug)}/stay-guide?${params.toString()}`;
}

export function guestBookingDocumentPath(
  origin: string,
  propertySlug: string,
  token: string,
  doc: 'gaf' | 'pet'
): string {
  const base = origin.replace(/\/+$/, '');
  const slug = propertySlug.trim();
  const t = token.trim();
  if (!slug || !t) return base;
  const params = new URLSearchParams({ token: t, doc });
  return `${base}/properties/${encodeURIComponent(slug)}/document?${params.toString()}`;
}

export function guestSdFormPath(origin: string, propertySlug: string, bookingId: string): string {
  const base = origin.replace(/\/+$/, '');
  const slug = propertySlug.trim();
  if (!slug) return `${base}/sd-form?bookingId=${encodeURIComponent(bookingId)}`;
  return `${base}/properties/${encodeURIComponent(slug)}/sd-form?bookingId=${encodeURIComponent(bookingId)}`;
}

export function guestPayParkingPath(
  origin: string,
  propertySlug: string,
  bookingId: string
): string {
  const base = origin.replace(/\/+$/, '');
  const slug = propertySlug.trim();
  if (!slug) {
    return `${base}/bookings/${encodeURIComponent(bookingId)}/parking`;
  }
  return `${base}/properties/${encodeURIComponent(slug)}/parking/${encodeURIComponent(bookingId)}`;
}
