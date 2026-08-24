import { useMemo } from 'react';

import { PublicPageCard } from '@/features/dashboard/custom-pages/components/PublicPageCard';
import {
  publicPageLastEditedLabel,
  publicPageTypeForGalleryId,
} from '@/features/dashboard/custom-pages/lib/publicPageLastEdited';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { orgPropertyCardModel } from '@/features/dashboard/org/lib/orgPropertyCardModel';
import { usePublicPageConfig } from '@/features/dashboard/page-editor/hooks/usePublicPageConfig';
import { buildPropertyGuestPublicPages } from '@/features/dashboard/property/lib/propertyGuestPublicPages';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';

export function CustomPagesPage() {
  const orgContext = useOptionalOrgContext();
  const propertySlug = orgContext?.property.slug ?? '';
  const propertyId = usePropertyIdParam();
  const propertyName = orgContext?.property.name?.trim() || 'Property';
  const coverUrl = orgContext ? orgPropertyCardModel(orgContext.property).thumbnailUrl : null;

  const stayGuideConfig = usePublicPageConfig('stay_guide');
  const listingConfig = usePublicPageConfig('property_landing');

  const pages = useMemo(() => {
    if (!propertySlug.trim() || !propertyId) return [];
    return buildPropertyGuestPublicPages(propertySlug, propertyId);
  }, [propertyId, propertySlug]);

  const editablePages = useMemo(() => pages.filter((page) => page.editable), [pages]);
  const staticPages = useMemo(() => pages.filter((page) => !page.editable), [pages]);

  function lastEditedFor(pageId: 'listing' | 'stay-guide'): string | null {
    const pageType = publicPageTypeForGalleryId(pageId);
    const query = pageType === 'stay_guide' ? stayGuideConfig : listingConfig;
    return publicPageLastEditedLabel(query.data, query.isLoading);
  }

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
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4">
              {editablePages.map((page) => (
                <li key={page.id}>
                  <PublicPageCard
                    page={page}
                    propertyName={propertyName}
                    coverUrl={coverUrl}
                    variant="editable"
                    lastEditedLabel={
                      page.id === 'listing' || page.id === 'stay-guide'
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
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {staticPages.map((page) => (
                <li key={page.id}>
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
