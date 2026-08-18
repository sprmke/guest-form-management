import { useMemo } from 'react';

import { PublicPageCard } from '@/features/dashboard/custom-pages/components/PublicPageCard';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { orgPropertyCardModel } from '@/features/dashboard/org/lib/orgPropertyCardModel';
import { buildPropertyGuestPublicPages } from '@/features/dashboard/property/lib/propertyGuestPublicPages';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';

export function CustomPagesPage() {
  const orgContext = useOptionalOrgContext();
  const propertySlug = orgContext?.property.slug ?? '';
  const propertyId = usePropertyIdParam();
  const propertyName = orgContext?.property.name?.trim() || 'Property';
  const coverUrl = orgContext ? orgPropertyCardModel(orgContext.property).thumbnailUrl : null;

  const pages = useMemo(() => {
    if (!propertySlug.trim() || !propertyId) return [];
    return buildPropertyGuestPublicPages(propertySlug, propertyId);
  }, [propertyId, propertySlug]);

  return (
    <AdminMobilePage
      title="Public Pages"
      subtitle="Every guest URL for this listing."
      titleId="public-pages-heading"
    >
      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {pages.map((page) => (
          <li key={page.id}>
            <PublicPageCard page={page} propertyName={propertyName} coverUrl={coverUrl} />
          </li>
        ))}
      </ul>
    </AdminMobilePage>
  );
}
