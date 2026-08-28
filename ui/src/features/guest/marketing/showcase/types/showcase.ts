/** Mirror of server PropertyShowcaseConfig — keep in sync with _shared/publicPageConfigs.ts */

export const SHOWCASE_TEMPLATE_KEYS = [
  'showcase-aurora',
  'showcase-monolith',
  'showcase-editorial',
] as const;

export type ShowcaseTemplateKey = (typeof SHOWCASE_TEMPLATE_KEYS)[number];

export const SHOWCASE_SECTION_IDS = [
  'hero',
  'gallery',
  'about',
  'amenities',
  'highlights',
  'location',
  'testimonials',
  'host',
  'cta',
] as const;

export type ShowcaseSectionId = (typeof SHOWCASE_SECTION_IDS)[number];

export type PropertyShowcaseSectionConfig = {
  id: ShowcaseSectionId;
  visible: boolean;
  order: number;
  columns?: number;
  copy?: { heading?: string; subheading?: string; body?: string };
  imageSlots?: string[];
  ctaLabel?: string;
  ctaTarget?: string;
};

export type PropertyShowcaseConfig = {
  version: 1;
  published: boolean;
  palette: {
    mode: 'light' | 'dark' | 'warm';
    accent: 'brand' | 'custom';
    customAccent: string | null;
    overlay: 'none' | 'soft' | 'strong';
  };
  typography: {
    displayFont: 'jakarta' | 'outfit' | 'instrument' | 'cormorant' | 'fraunces';
    scale: 'sm' | 'md' | 'lg';
  };
  motion: {
    intensity: 'subtle' | 'standard' | 'bold';
    parallax: boolean;
    canvas: boolean;
  };
  sections: PropertyShowcaseSectionConfig[];
};

export type ShowcaseTestimonial = {
  id: string;
  author: string;
  body: string;
  rating?: number | null;
};

export type ShowcaseResolvedSection = PropertyShowcaseSectionConfig & {
  heading: string;
  subheading?: string;
  body?: string;
  images: string[];
};

export type ShowcaseSocialLinks = {
  facebookUrl: string | null;
  airbnbUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
};

export type ShowcaseGuestContact = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  socialLinks: ShowcaseSocialLinks;
};

export type ShowcaseHostInfo = {
  ownerName: string;
  ownerAvatarUrl: string | null;
  organizationName: string;
  organizationSlug: string;
  organizationLogoUrl: string | null;
  verifiedBadge: boolean;
  isSuperhost: boolean;
};

export type ShowcaseData = {
  templateKey: ShowcaseTemplateKey;
  published: boolean;
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  brandColor: string;
  logoUrl: string | null;
  description: string | null;
  locationLabel: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  zipCode: string | null;
  amenities: string[];
  highlights: string[];
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  mapsUrl: string | null;
  host: ShowcaseHostInfo;
  guestContact: ShowcaseGuestContact;
  hostPublicPath: string | null;
  contactPath: string;
  testimonials: ShowcaseTestimonial[];
  formPath: string;
  calendarPath: string;
  config: PropertyShowcaseConfig;
  sections: ShowcaseResolvedSection[];
  accentColor: string;
  embed: boolean;
  reducedMotion: boolean;
};

export function isShowcaseTemplateKey(value: unknown): value is ShowcaseTemplateKey {
  return typeof value === 'string' && (SHOWCASE_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function defaultPropertyShowcaseConfig(): PropertyShowcaseConfig {
  return {
    version: 1,
    published: false,
    palette: {
      mode: 'light',
      accent: 'brand',
      customAccent: null,
      overlay: 'soft',
    },
    typography: {
      displayFont: 'jakarta',
      scale: 'md',
    },
    motion: {
      intensity: 'standard',
      parallax: true,
      canvas: true,
    },
    sections: SHOWCASE_SECTION_IDS.map((id, order) => ({
      id,
      visible: true,
      order,
    })),
  };
}
