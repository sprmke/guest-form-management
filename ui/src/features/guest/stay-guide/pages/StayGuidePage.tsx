import { useEffect, useMemo } from 'react';

import { useParams, useSearchParams } from 'react-router-dom';

import { StayGuideChapter } from '@/features/guest/stay-guide/components/StayGuideChapter';
import { StayGuideCheckInDocumentsSection } from '@/features/guest/stay-guide/components/StayGuideCheckInDocumentsSection';
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
import type { StayGuideSectionConfig } from '@/features/guest/stay-guide/lib/api';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { applyBrandCssVariables } from '@/lib/theme/applyBrandCssVariables';
import { buildGuestBrandStyle } from '@/lib/theme/brandColor';
import { cn } from '@/lib/utils';

/**
 * Mirrors the real page's section shapes (hero, stay pass card, gallery carousel,
 * quick-nav tabs, chapters, help section) so loading never flashes a bare spinner.
 */
function resolveStayGuideSectionConfig(
  raw: StayGuideSectionConfig | undefined
): StayGuideSectionConfig {
  const defaults = defaultStayGuideSectionConfig();
  if (!raw) return defaults;
  return {
    ...defaults,
    ...raw,
    checkInDocuments: raw.checkInDocuments ?? defaults.checkInDocuments,
  };
}

function StayGuidePageSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#FFFFFF] dark:bg-[#0A0A0A]"
      aria-busy="true"
      aria-label="Loading stay guide"
    >
      <div className="bg-muted relative h-[62vh] max-h-[620px] min-h-[420px] w-full animate-pulse sm:h-[68vh]">
        <div className="absolute inset-x-0 top-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[56px] max-w-[720px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-background/30 size-9 shrink-0 rounded-md sm:size-10" />
              <div className="bg-background/30 hidden h-4 w-28 rounded sm:block" />
            </div>
            <div className="bg-background/30 h-9 w-9 shrink-0 rounded-full" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-[720px] space-y-3 text-center">
            <div className="bg-background/30 mx-auto h-2.5 w-24 rounded-full" />
            <div className="bg-background/30 mx-auto h-9 w-56 rounded-lg sm:h-11 sm:w-72" />
          </div>
        </div>
      </div>

      <div className="relative z-30 mx-auto -mt-6 max-w-[720px] px-4 sm:-mt-16 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-[0_16px_40px_-12px_rgba(34,31,26,0.35)] sm:p-0 dark:border-[#262626] dark:bg-[#171717]">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            <div className="flex flex-1 flex-col gap-2 border-b border-dashed border-[#E5E5E5] pb-5 sm:border-b-0 sm:border-r sm:p-6 sm:pb-0 dark:border-[#262626]">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-1 items-center gap-3 pt-5 sm:gap-4 sm:p-6 sm:pt-5">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 sm:mt-10">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <Skeleton className="mb-3 h-2.5 w-14" />
        </div>
        <div className="flex gap-3 overflow-x-hidden px-4 pb-1 sm:px-6 lg:px-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-56 shrink-0 rounded-2xl sm:h-48 sm:w-72" />
          ))}
        </div>
      </div>

      <div className="border-b border-[#171717]/10 dark:border-[#FAFAFA]/10">
        <div className="mx-auto flex max-w-[720px] gap-1.5 overflow-x-hidden px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[720px] space-y-10 px-4 py-8 sm:space-y-14 sm:px-6 sm:py-10 lg:px-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-6 w-40" />
              </div>
            </div>
            <div className="space-y-3 rounded-3xl border border-[#171717]/10 p-5 sm:p-8 dark:border-[#FAFAFA]/10">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[720px] space-y-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="rounded-3xl border border-[#171717]/10 p-5 sm:p-8 dark:border-[#FAFAFA]/10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
              <div className="flex items-center gap-4 sm:gap-5 lg:flex-col lg:items-center">
                <Skeleton className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full sm:h-24 sm:w-24" />
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <Skeleton className="h-[52px] w-full rounded-2xl" />
                <Skeleton className="h-[52px] w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const sectionConfig = resolveStayGuideSectionConfig(data?.sectionConfig);
  const checkInDocuments = data?.checkInDocuments ?? [];
  const showCheckInDocuments =
    sectionConfig.checkInDocuments.visible && checkInDocuments.length > 0;
  const chapters = useMemo(
    () =>
      applyStayGuideSectionConfig(
        buildStayGuideChapters(data?.sections ?? []),
        data?.sectionConfig
      ),
    [data?.sections, data?.sectionConfig]
  );
  const quickNavItems = useMemo(
    () =>
      buildQuickNavItems(chapters, {
        includeHelp: sectionConfig.helpSection.visible,
        includeCheckInDocuments: showCheckInDocuments,
      }),
    [chapters, sectionConfig.helpSection.visible, showCheckInDocuments]
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
    return <StayGuidePageSkeleton />;
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

      {showCheckInDocuments ? (
        <div className="mx-auto mt-8 max-w-[720px] sm:mt-10">
          <StayGuideCheckInDocumentsSection documents={checkInDocuments} />
        </div>
      ) : null}

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
