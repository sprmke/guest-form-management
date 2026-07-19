import { useEffect, useMemo } from 'react';

import { useParams, useSearchParams } from 'react-router-dom';

import { Loader2 } from 'lucide-react';

import { StayGuideHelpSection } from '@/features/guest/stay-guide/components/StayGuideHelpSection';
import { StayGuideHero } from '@/features/guest/stay-guide/components/StayGuideHero';
import { StayGuideTabs } from '@/features/guest/stay-guide/components/StayGuideTabs';
import {
  useGuestStayGuide,
  useGuestStayGuidePreview,
} from '@/features/guest/stay-guide/hooks/useGuestStayGuide';

import { applyBrandCssVariables } from '@/lib/theme/applyBrandCssVariables';
import { buildGuestBrandStyle } from '@/lib/theme/brandColor';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

export function StayGuidePage() {
  const { propertySlug = '' } = useParams<{ propertySlug: string }>();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();
  const isPreview = searchParams.get('preview') === '1';
  const previewPropertyId = (searchParams.get('property_id') ?? '').trim();
  const { resolvedTheme } = useTheme();

  const tokenQuery = useGuestStayGuide(propertySlug, token);
  const previewQuery = useGuestStayGuidePreview(propertySlug, previewPropertyId);
  const activeQuery = isPreview ? previewQuery : tokenQuery;
  const { data, isLoading, isError, error } = activeQuery;

  const brandStyle = useMemo(
    () => buildGuestBrandStyle(data?.property.brandColor, resolvedTheme === 'dark'),
    [data?.property.brandColor, resolvedTheme]
  );

  useEffect(() => {
    return applyBrandCssVariables(document.documentElement, brandStyle as Record<string, string>);
  }, [brandStyle]);

  if (!isPreview && !token) {
    return (
      <StayGuideUnavailable message="Missing access link. Open the guide from your check-in email." />
    );
  }

  if (isPreview && !previewPropertyId) {
    return (
      <StayGuideUnavailable message="Open stay guide preview from Templates in the dashboard." />
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
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

  return (
    <div className="bg-muted/25 text-foreground min-h-screen">
      {isPreview ? (
        <div
          className="border-border/70 bg-card/90 text-muted-foreground border-b px-4 py-2 text-center text-xs font-medium"
          role="status"
        >
          Preview
        </div>
      ) : null}
      <StayGuideHero guide={data} />
      <StayGuideTabs sections={data.sections} property={data.property} />
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
    </div>
  );
}

function StayGuideUnavailable({ message }: { message: string }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div
        className={cn(
          'border-border/70 bg-card max-w-md rounded-2xl border p-8 text-center shadow-sm'
        )}
      >
        <p className="text-foreground text-base font-medium">{message}</p>
      </div>
    </div>
  );
}
