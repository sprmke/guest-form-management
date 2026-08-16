import * as React from 'react';

import { guestStayGuidePreviewPath } from '@/features/guest/lib/guestPublicPaths';

import { CustomPageCard } from '@/features/dashboard/custom-pages/components/CustomPageCard';
import { useCustomPages } from '@/features/dashboard/custom-pages/hooks/useCustomPages';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomPagesPage() {
  const { data: pages, isLoading, error } = useCustomPages();
  const orgContext = useOptionalOrgContext();
  const propertySlug = orgContext?.property.slug ?? '';
  const propertyId = usePropertyIdParam();

  const stayGuidePreviewHref = React.useMemo(() => {
    if (!propertySlug.trim() || !propertyId) return null;
    if (typeof window === 'undefined') return guestStayGuidePreviewPath(propertySlug, propertyId);
    return `${window.location.origin}${guestStayGuidePreviewPath(propertySlug, propertyId)}`;
  }, [propertyId, propertySlug]);

  const hasStayGuidePage = pages?.some((page) => page.pageType === 'stay_guide') ?? false;

  return (
    <AdminMobilePage
      title="Custom Pages"
      subtitle="Choose how guest-facing pages look for this property."
      titleId="custom-pages-heading"
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 1 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">Failed to load custom pages.</p> : null}

      {hasStayGuidePage ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CustomPageCard
            title="Stay Guide"
            description="Guests get their personalized link automatically at check-in."
            previewHref={stayGuidePreviewHref}
          />
        </div>
      ) : null}
    </AdminMobilePage>
  );
}
