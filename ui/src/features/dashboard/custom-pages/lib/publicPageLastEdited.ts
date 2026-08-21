import { formatDistanceToNow } from 'date-fns';

import type {
  PublicPageConfigDto,
  PublicPageType,
} from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';
import { defaultPropertyLandingSectionConfig } from '@/features/guest/marketing/properties/lib/propertyLandingSections';
import type { PropertyLandingSectionConfig } from '@/features/guest/marketing/properties/types/publicProperty';
import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';
import { defaultStayGuideSectionConfig } from '@/features/guest/stay-guide/lib/stayGuideChapters';

/** Gallery page id → `public_page_configs.page_type`. */
export function publicPageTypeForGalleryId(pageId: 'listing' | 'stay-guide'): PublicPageType {
  return pageId === 'listing' ? 'property_landing' : 'stay_guide';
}

function isDefaultPublicPageConfig(dto: PublicPageConfigDto): boolean {
  if (dto.pageType === 'stay_guide') {
    return (
      JSON.stringify(dto.config as StayGuideSectionConfig) ===
      JSON.stringify(defaultStayGuideSectionConfig())
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
