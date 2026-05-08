/**
 * Public guest-form handoff for Airbnb-branded copy + `bookingSource` on submit.
 * Use **`?source=airbnb`** (case-insensitive). Legacy **`?from=airbnb`** is migrated in
 * `GuestForm` to `source=airbnb` and stripped from the URL.
 */
export function bookingSourceFromUrlSearchParams(
  sp: URLSearchParams,
): 'Facebook' | 'Airbnb' {
  const v = sp.get('source')?.trim().toLowerCase();
  if (v === 'airbnb') return 'Airbnb';
  return 'Facebook';
}

/** Removes deprecated `from=` used for an earlier Airbnb handoff experiment. */
export function stripLegacyFromQueryParam(sp: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(sp);
  next.delete('from');
  return next;
}
