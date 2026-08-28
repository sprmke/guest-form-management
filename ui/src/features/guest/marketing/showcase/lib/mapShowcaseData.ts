import {
  guestCalendarPath,
  guestFormPath,
  guestHostPath,
} from '@/features/guest/lib/guestPublicPaths';
import { publicContactPath } from '@/features/guest/marketing/contact/lib/publicContactParams';
import type { ResolvedPropertyDetail } from '@/features/guest/marketing/properties/types/publicProperty';
import {
  defaultPropertyShowcaseConfig,
  isShowcaseTemplateKey,
  SHOWCASE_SECTION_IDS,
  type PropertyShowcaseConfig,
  type ShowcaseData,
  type ShowcaseGuestContact,
  type ShowcaseResolvedSection,
  type ShowcaseSectionId,
  type ShowcaseTemplateKey,
  type ShowcaseTestimonial,
} from '@/features/guest/marketing/showcase/types/showcase';

const SECTION_DEFAULTS: Record<ShowcaseSectionId, { heading: string; subheading?: string }> = {
  hero: { heading: 'Your stay', subheading: 'A place made for arriving well' },
  gallery: { heading: 'Gallery' },
  about: { heading: 'About' },
  amenities: { heading: 'Amenities' },
  highlights: { heading: 'Highlights' },
  location: { heading: 'Location' },
  testimonials: { heading: 'Guest voices' },
  host: { heading: 'Your host', subheading: 'Questions before you book? Reach out anytime.' },
  cta: { heading: 'Ready to book?', subheading: 'Check dates or start your request' },
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isEmbedMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('embed') === '1';
}

function resolveImages(property: ResolvedPropertyDetail, slots: string[] | undefined): string[] {
  const all = property.images.length
    ? property.images
    : property.media.filter((m) => m.type === 'image').map((m) => m.url);
  if (!slots?.length) return all.slice(0, 12);
  const byUrl = new Set(all);
  const picked = slots.filter((url) => byUrl.has(url));
  return picked.length > 0 ? picked : all.slice(0, 12);
}

function normalizeConfig(raw: unknown): PropertyShowcaseConfig {
  const base = defaultPropertyShowcaseConfig();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<PropertyShowcaseConfig>;
  const sectionsRaw = Array.isArray(obj.sections) ? obj.sections : base.sections;
  const byId = new Map<ShowcaseSectionId, (typeof base.sections)[number]>();
  for (const section of base.sections) byId.set(section.id, { ...section });
  for (const entry of sectionsRaw) {
    if (!entry || typeof entry !== 'object') continue;
    const rawId = (entry as { id?: string }).id;
    const id = rawId === 'houseRules' ? 'host' : rawId;
    if (!id || !SHOWCASE_SECTION_IDS.includes(id as ShowcaseSectionId)) continue;
    const sectionId = id as ShowcaseSectionId;
    const existing = byId.get(sectionId)!;
    byId.set(sectionId, {
      ...existing,
      ...(entry as typeof existing),
      id: sectionId,
      visible:
        sectionId === 'hero' || sectionId === 'cta'
          ? true
          : Boolean((entry as { visible?: boolean }).visible ?? existing.visible),
    });
  }
  const sections = [...byId.values()].sort((a, b) => a.order - b.order);
  sections.forEach((s, i) => {
    s.order = i;
  });
  return {
    version: 1,
    published: typeof obj.published === 'boolean' ? obj.published : base.published,
    palette: { ...base.palette, ...(obj.palette ?? {}) },
    typography: { ...base.typography, ...(obj.typography ?? {}) },
    motion: { ...base.motion, ...(obj.motion ?? {}) },
    sections,
  };
}

function resolveGuestContact(
  input: Partial<ShowcaseGuestContact> | null | undefined,
  property: ResolvedPropertyDetail
): ShowcaseGuestContact {
  const host = property.host;
  const social = input?.socialLinks;
  return {
    contactName: input?.contactName?.trim() || host?.ownerName || '',
    contactPhone: input?.contactPhone?.trim() || '',
    contactEmail: input?.contactEmail?.trim() || '',
    socialLinks: {
      facebookUrl: social?.facebookUrl ?? null,
      airbnbUrl: social?.airbnbUrl ?? null,
      instagramUrl: social?.instagramUrl ?? null,
      tiktokUrl: social?.tiktokUrl ?? null,
    },
  };
}

export function mapShowcaseData(input: {
  property: ResolvedPropertyDetail;
  config: unknown;
  templateKey: string;
  guestContact?: Partial<ShowcaseGuestContact> | null;
}): ShowcaseData {
  const config = normalizeConfig(input.config);
  const templateKey: ShowcaseTemplateKey = isShowcaseTemplateKey(input.templateKey)
    ? input.templateKey
    : 'showcase-aurora';
  const property = input.property;
  const embed = isEmbedMode();
  const reducedMotion = prefersReducedMotion();
  const guestContact = resolveGuestContact(input.guestContact, property);

  const testimonials: ShowcaseTestimonial[] = (property.guestReviews ?? []).map((review) => ({
    id: review.id,
    author: review.author || 'Guest',
    body: review.comment || '',
    rating: review.rating,
  }));

  const highlights = [
    `${property.bedrooms} bedroom${property.bedrooms === 1 ? '' : 's'}`,
    `${property.bathrooms} bath${property.bathrooms === 1 ? '' : 's'}`,
    `Up to ${property.guests} guests`,
    property.checkInTime ? `Check-in ${property.checkInTime}` : '',
  ].filter(Boolean);

  const city =
    property.location.split(',')[0]?.trim() ||
    property.address.split(',')[0]?.trim() ||
    property.location;

  const sections: ShowcaseResolvedSection[] = config.sections
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const defaults = SECTION_DEFAULTS[section.id];
      const images = resolveImages(property, section.imageSlots);
      let body = section.copy?.body;
      if (section.id === 'about' && !body) body = property.description ?? undefined;
      if (section.id === 'location' && !body) {
        body = property.address?.trim() || undefined;
      }
      return {
        ...section,
        heading: section.copy?.heading?.trim() || defaults.heading,
        subheading: section.copy?.subheading?.trim() || defaults.subheading,
        body,
        images,
      };
    });

  const brandColor = property.brandColor || 'hsl(168 65% 40%)';
  const accentColor =
    config.palette.accent === 'custom' && config.palette.customAccent
      ? config.palette.customAccent
      : brandColor;

  const orgSlug = property.host?.organizationSlug?.trim() || '';

  return {
    templateKey,
    published: config.published,
    propertyId: property.id,
    propertySlug: property.slug,
    propertyName: property.name,
    brandColor,
    logoUrl: property.host?.organizationLogoUrl ?? null,
    description: property.description,
    locationLabel: property.location,
    address: property.address,
    city,
    state: property.state,
    country: property.country,
    zipCode: property.zipCode,
    amenities: property.amenities ?? [],
    highlights,
    latitude: property.latitude,
    longitude: property.longitude,
    placeId: property.placeId,
    mapsUrl: property.mapsUrl ?? null,
    host: {
      ownerName: property.host?.ownerName || guestContact.contactName || 'Host',
      ownerAvatarUrl: property.host?.ownerAvatarUrl ?? null,
      organizationName: property.host?.organizationName || 'Host',
      organizationSlug: orgSlug,
      organizationLogoUrl: property.host?.organizationLogoUrl ?? null,
      verifiedBadge: Boolean(property.verifiedBadge),
      isSuperhost: Boolean(property.isSuperhost),
    },
    guestContact,
    hostPublicPath: orgSlug ? guestHostPath(orgSlug) : null,
    contactPath: publicContactPath({ subject: property.name }),
    testimonials,
    formPath: guestFormPath(property.slug),
    calendarPath: guestCalendarPath(property.slug),
    config,
    sections,
    accentColor,
    embed,
    reducedMotion,
  };
}
