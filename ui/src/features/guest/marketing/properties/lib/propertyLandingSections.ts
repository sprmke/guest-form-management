import type {
  PropertyLandingSectionConfig,
  PropertyLandingSectionId,
} from '@/features/guest/marketing/properties/types/publicProperty';

const DEFAULT_SECTION_ORDER: PropertyLandingSectionId[] = [
  'gallery',
  'overview',
  'amenities',
  'location',
  'rules',
  'reviews',
];

export function defaultPropertyLandingSectionConfig(): PropertyLandingSectionConfig {
  return {
    version: 1,
    sections: DEFAULT_SECTION_ORDER.map((id, order) => ({
      id,
      visible: true,
      order,
    })),
  };
}

/** Visible sections in host-configured order; defaults match today's hardcoded layout. */
export function resolvePropertyLandingSections(
  sectionConfig?: PropertyLandingSectionConfig | null
): PropertyLandingSectionId[] {
  const config = sectionConfig ?? defaultPropertyLandingSectionConfig();
  return [...config.sections]
    .sort(
      (a, b) =>
        a.order - b.order ||
        DEFAULT_SECTION_ORDER.indexOf(a.id) - DEFAULT_SECTION_ORDER.indexOf(b.id)
    )
    .filter((section) => section.visible)
    .map((section) => section.id);
}
