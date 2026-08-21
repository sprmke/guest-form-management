import { useEffect, useMemo } from 'react';

import { useParams, useSearchParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { StayGuideChapter } from '@/features/guest/stay-guide/components/StayGuideChapter';
import { StayGuideGalleryCarousel } from '@/features/guest/stay-guide/components/StayGuideGalleryCarousel';
import { StayGuideHelpSection } from '@/features/guest/stay-guide/components/StayGuideHelpSection';
import { StayGuideHero } from '@/features/guest/stay-guide/components/StayGuideHero';
import { StayGuideTabs } from '@/features/guest/stay-guide/components/StayGuideTabs';
import { StayPassCard } from '@/features/guest/stay-guide/components/StayPassCard';
import {
  useGuestStayGuide,
  useGuestStayGuidePreview,
} from '@/features/guest/stay-guide/hooks/useGuestStayGuide';
import { usePreviewOverride } from '@/features/guest/lib/previewOverrideContext';
import {
  applyStayGuideSectionConfig,
  buildQuickNavItems,
  buildStayGuideChapters,
  defaultStayGuideSectionConfig,
} from '@/features/guest/stay-guide/lib/stayGuideChapters';

import { useTheme } from '@/components/theme/ThemeProvider';
import { applyBrandCssVariables } from '@/lib/theme/applyBrandCssVariables';
import { buildGuestBrandStyle } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

export function StayGuidePage() {
  const { propertySlug = '' } = useParams<{ propertySlug: string }>();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();
  const isPreview = searchParams.get('preview') === '1';
  const previewPropertyId = (searchParams.get('property_id') ?? '').trim();
  const { resolvedTheme } = useTheme();
  const previewOverride = usePreviewOverride();
  const isEditorPreview = previewOverride?.kind === 'stay-guide';

  const tokenQuery = useGuestStayGuide(propertySlug, token);
  const previewQuery = useGuestStayGuidePreview(propertySlug, previewPropertyId);
  const activeQuery = isEditorPreview
    ? {
        data: previewOverride.data,
        isLoading: false,
        isError: false,
        error: null as Error | null,
      }
    : isPreview
      ? previewQuery
      : tokenQuery;
  const { data, isLoading, isError, error } = activeQuery;

  const brandStyle = useMemo(
    () => buildGuestBrandStyle(data?.property.brandColor, resolvedTheme === 'dark'),
    [data?.property.brandColor, resolvedTheme]
  );

  useEffect(() => {
    return applyBrandCssVariables(document.documentElement, brandStyle as Record<string, string>);
  }, [brandStyle]);

  const sectionConfig = data?.sectionConfig ?? defaultStayGuideSectionConfig();
  const chapters = useMemo(
    () =>
      applyStayGuideSectionConfig(
        buildStayGuideChapters(data?.sections ?? []),
        data?.sectionConfig
      ),
    [data?.sections, data?.sectionConfig]
  );
  const quickNavItems = useMemo(
    () => buildQuickNavItems(chapters, { includeHelp: sectionConfig.helpSection.visible }),
    [chapters, sectionConfig.helpSection.visible]
  );

  if (!isEditorPreview && !isPreview && !token) {
    return (
      <StayGuideUnavailable message="Missing access link. Open the guide from your check-in email." />
    );
  }

  if (!isEditorPreview && isPreview && !previewPropertyId) {
    return (
      <StayGuideUnavailable message="Open stay guide preview from Templates in the dashboard." />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] dark:bg-[#0A0A0A]">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StayGuideUnavailable
        message={error instanceof Error ? error.message : 'This stay guide is not available.'}
      />
    );
  }

  const galleryImages = data.property.galleryImages.filter((url) => url.trim());

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#171717] dark:bg-[#0A0A0A] dark:text-[#FAFAFA]">
      {sectionConfig.hero.visible ? <StayGuideHero guide={data} /> : null}
      {sectionConfig.stayPassCard.visible ? <StayPassCard guide={data} /> : null}

      {sectionConfig.galleryCarousel.visible && galleryImages.length > 0 ? (
        <StayGuideGalleryCarousel
          images={galleryImages}
          propertyName={data.property.name}
          className="mx-auto mt-8 sm:mt-10"
        />
      ) : null}

      {sectionConfig.quickNavTabs.visible ? <StayGuideTabs items={quickNavItems} /> : null}

      <div className="mx-auto max-w-[720px] space-y-10 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-10 lg:px-8">
        {chapters.map((chapter) => (
          <StayGuideChapter
            key={chapter.id}
            chapter={chapter}
            propertyLocation={data.property.location}
            towerAndUnit={data.property.towerAndUnit}
            accentColor={chapter.accentColor}
          />
        ))}
      </div>

      {sectionConfig.helpSection.visible ? (
        <StayGuideHelpSection
          host={
            data.host ?? {
              name: data.property.name,
              avatarUrl: data.property.logoUrl,
              organizationName: data.property.name,
            }
          }
          contact={data.contact}
        />
      ) : null}
    </div>
  );
}

function StayGuideUnavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4 dark:bg-[#0A0A0A]">
      <div
        className={cn(
          'max-w-md rounded-2xl border border-[#171717]/10 bg-[#F5F5F5] p-8 text-center shadow-sm dark:border-[#FAFAFA]/10 dark:bg-[#171717]'
        )}
      >
        <p className="text-base font-medium text-[#171717] dark:text-[#FAFAFA]">{message}</p>
      </div>
    </div>
  );
}
