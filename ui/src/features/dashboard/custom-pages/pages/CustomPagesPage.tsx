import { useMemo } from 'react';

import type { PropertyShowcaseConfig } from '@/features/guest/marketing/showcase/types/showcase';

import { PublicPageCard } from '@/features/dashboard/custom-pages/components/PublicPageCard';
import {
  publicPageLastEditedLabel,
  publicPageTypeForGalleryId,
} from '@/features/dashboard/custom-pages/lib/publicPageLastEdited';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { orgPropertyCardModel } from '@/features/dashboard/org/lib/orgPropertyCardModel';
import { usePublicPageConfig } from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';
import { usePropertyEntitlements } from '@/features/dashboard/plans/hooks/usePropertyEntitlements';
import { isFeatureEnabled } from '@/features/dashboard/plans/lib/planFeatures';
import { buildPropertyGuestPublicPages } from '@/features/dashboard/property/lib/propertyGuestPublicPages';
import { usePropertyPermissions } from '@/features/dashboard/team/hooks/usePropertyPermissions';
import { hasPropertyPermission } from '@/features/dashboard/team/lib/propertyPermissions';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';

export function CustomPagesPage() {
  const orgContext = useOptionalOrgContext();
  const propertySlug = orgContext?.property.slug ?? '';
  const propertyId = usePropertyIdParam();
  const propertyName = orgContext?.property.name?.trim() || 'Property';
  const coverUrl = orgContext ? orgPropertyCardModel(orgContext.property).thumbnailUrl : null;
  const { data: access } = usePropertyPermissions();
  const { open } = useUpgradeModal();
  const entitlements = usePropertyEntitlements();
  const canShowcase = entitlements.data
    ? isFeatureEnabled(entitlements.data, 'propertyShowcase')
    : false;
  const canEditListing = hasPropertyPermission(access?.permissions, 'publicPages.property:edit');
  const canEditStayGuide = hasPropertyPermission(access?.permissions, 'publicPages.stayGuide:edit');
  const canEditShowcase = hasPropertyPermission(access?.permissions, 'publicPages.showcase:edit');

  function canEditPage(pageId: string): boolean {
    if (pageId === 'listing') return canEditListing;
    if (pageId === 'stay-guide') return canEditStayGuide;
    if (pageId === 'showcase') return canEditShowcase;
    return false;
  }

  const stayGuideConfig = usePublicPageConfig('stay_guide');
  const listingConfig = usePublicPageConfig('property_landing');
  const showcaseConfig = usePublicPageConfig('property_showcase');

  const pages = useMemo(() => {
    if (!propertySlug.trim() || !propertyId) return [];
    return buildPropertyGuestPublicPages(propertySlug, propertyId);
  }, [propertyId, propertySlug]);

  const editablePages = useMemo(() => pages.filter((page) => page.editable), [pages]);
  const staticPages = useMemo(() => pages.filter((page) => !page.editable), [pages]);

  function lastEditedFor(pageId: 'listing' | 'stay-guide' | 'showcase'): string | null {
    const pageType = publicPageTypeForGalleryId(pageId);
    const query =
      pageType === 'stay_guide'
        ? stayGuideConfig
        : pageType === 'property_showcase'
          ? showcaseConfig
          : listingConfig;
    return publicPageLastEditedLabel(query.data, query.isLoading);
  }

  const showcasePublished =
    showcaseConfig.data &&
    (showcaseConfig.data.config as PropertyShowcaseConfig).published === true;

  return (
    <AdminMobilePage
      title="Public Pages"
      subtitle="Every guest URL for this listing."
      titleId="public-pages-heading"
    >
      <div className="flex flex-col gap-8 sm:gap-10">
        {editablePages.length > 0 ? (
          <section aria-labelledby="public-pages-design-heading">
            <h2
              id="public-pages-design-heading"
              className="text-foreground mb-3 text-sm font-semibold tracking-tight sm:mb-4"
            >
              Design your pages
            </h2>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:items-stretch sm:gap-4">
              {editablePages.map((page) => (
                <li key={page.id} className="h-full">
                  <PublicPageCard
                    page={page}
                    propertyName={propertyName}
                    coverUrl={coverUrl}
                    variant="editable"
                    canEdit={canEditPage(page.id)}
                    locked={page.id === 'showcase' && !canShowcase}
                    onUnlock={() => open('propertyShowcase')}
                    publishState={
                      page.id === 'showcase' ? (showcasePublished ? 'published' : 'draft') : null
                    }
                    lastEditedLabel={
                      page.id === 'listing' || page.id === 'stay-guide' || page.id === 'showcase'
                        ? lastEditedFor(page.id)
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {staticPages.length > 0 ? (
          <section aria-labelledby="public-pages-other-heading">
            <h2
              id="public-pages-other-heading"
              className="text-foreground mb-3 text-sm font-semibold tracking-tight sm:mb-4"
            >
              Other guest pages
            </h2>
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:items-stretch sm:gap-4 xl:grid-cols-3">
              {staticPages.map((page) => (
                <li key={page.id} className="h-full">
                  <PublicPageCard
                    page={page}
                    propertyName={propertyName}
                    coverUrl={coverUrl}
                    variant="static"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AdminMobilePage>
  );
}
