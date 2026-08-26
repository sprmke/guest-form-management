type AddressComponent = google.maps.GeocoderAddressComponent;

export function parseGoogleAddressComponents(components: AddressComponent[] | undefined): {
  city: string;
  province: string;
  country: string;
} {
  if (!components?.length) {
    return { city: '', province: '', country: 'Philippines' };
  }

  const pick = (...types: string[]) => {
    const match = components.find((entry) => types.some((type) => entry.types.includes(type)));
    return match?.long_name?.trim() ?? '';
  };

  const city = pick('locality', 'postal_town', 'administrative_area_level_2', 'sublocality') || '';
  const province = pick('administrative_area_level_1');
  const country = pick('country') || 'Philippines';

  return { city, province, country };
}

/** Short guest-facing label (city, province, country) — max 120 chars for guest_profiles.location_label. */
export function locationLabelFromPlace(place: google.maps.places.PlaceResult): string | null {
  const parts = parseGoogleAddressComponents(place.address_components);
  const meta = [parts.city, parts.province, parts.country].filter((part) => part.trim().length > 0);
  if (meta.length > 0) {
    return meta.join(', ').slice(0, 120);
  }

  const formatted = place.formatted_address?.trim();
  return formatted ? formatted.slice(0, 120) : null;
}
