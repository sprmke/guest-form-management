const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type StayGuideSectionDto = {
  key: string;
  label: string;
  displayHeading: string;
  html: string;
  imageUrl: string | null;
  /** Template row `updated_at` — cache-busts fixed storage paths after replace. */
  imageUpdatedAt?: string | null;
};

export type GuestStayGuideDto = {
  property: {
    slug: string;
    name: string;
    brandColor: string;
    logoUrl: string | null;
    locationLabel: string;
    towerAndUnit: string | null;
    location: {
      address: string;
      city: string;
      province: string | null;
      country: string;
      zipCode: string | null;
      latitude: number | null;
      longitude: number | null;
      placeId: string | null;
      mapsUrl: string | null;
    };
    heroImageUrl: string | null;
    galleryImages: string[];
    images: string[];
  };
  booking: {
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    checkInTime: string;
    checkOutTime: string;
    needParking: boolean;
    hasPets: boolean;
  };
  contact: {
    phone: string;
    email: string;
    facebookUrl: string;
    airbnbUrl: string;
  };
  host: {
    name: string;
    avatarUrl: string | null;
    organizationName: string;
  };
  sections: StayGuideSectionDto[];
  validUntil: string;
  todayManila: string;
  templateKey: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error?: string; message?: string };

export async function fetchGuestStayGuide(
  propertySlug: string,
  token: string
): Promise<GuestStayGuideDto> {
  const params = new URLSearchParams({
    token,
    property: propertySlug,
  });
  const res = await fetch(`${FUNCTIONS_URL}/get-guest-stay-guide?${params.toString()}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  const json = (await res.json()) as ApiSuccess<GuestStayGuideDto> | ApiError;
  if (!res.ok || !json.success) {
    throw new Error(
      ('message' in json && json.message) || 'This stay guide is not available right now.'
    );
  }
  return json.data;
}
