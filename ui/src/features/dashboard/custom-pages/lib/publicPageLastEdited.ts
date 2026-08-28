import { formatDistanceToNow } from 'date-fns';

import { defaultPropertyLandingSectionConfig } from '@/features/guest/marketing/properties/lib/propertyLandingSections';
import type { PropertyLandingSectionConfig } from '@/features/guest/marketing/properties/types/publicProperty';
import {
  defaultPropertyShowcaseConfig,
  type PropertyShowcaseConfig,
} from '@/features/guest/marketing/showcase/types/showcase';
import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';
import { defaultStayGuideSectionConfig } from '@/features/guest/stay-guide/lib/stayGuideChapters';

import type {
  PublicPageConfigDto,
  PublicPageType,
} from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';

/** Gallery page id → `public_page_configs.page_type`. */
export function publicPageTypeForGalleryId(
  pageId: 'listing' | 'stay-guide' | 'showcase'
): PublicPageType {
  if (pageId === 'listing') return 'property_landing';
  if (pageId === 'showcase') return 'property_showcase';
  return 'stay_guide';
}

function isDefaultPublicPageConfig(dto: PublicPageConfigDto): boolean {
  if (dto.pageType === 'stay_guide') {
    return (
      JSON.stringify(dto.config as StayGuideSectionConfig) ===
      JSON.stringify(defaultStayGuideSectionConfig())
    );
  }
  if (dto.pageType === 'property_showcase') {
    const config = dto.config as PropertyShowcaseConfig;
    return (
      config.published === false &&
      JSON.stringify(config.sections) === JSON.stringify(defaultPropertyShowcaseConfig().sections)
    );
  }
  return (
    JSON.stringify(dto.config as PropertyLandingSectionConfig) ===
    JSON.stringify(defaultPropertyLandingSectionConfig())
  );
}

/** Meta line for editable Public Pages cards. */
export function publicPageLastEditedLabel(
  dto: PublicPageConfigDto | undefined,
  isLoading: boolean
): string | null {
  if (isLoading || !dto) return null;
  if (isDefaultPublicPageConfig(dto)) return 'Not customized yet';
  try {
    const relative = formatDistanceToNow(new Date(dto.updatedAt), { addSuffix: true });
    return `Last edited ${relative}`;
  } catch {
    return 'Not customized yet';
  }
}
