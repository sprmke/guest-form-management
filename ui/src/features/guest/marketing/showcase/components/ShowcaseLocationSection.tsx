import { Navigation } from 'lucide-react';

import { ShowcaseMapEmbed } from '@/features/guest/marketing/showcase/components/ShowcaseMapEmbed';
import { ShowcaseReveal } from '@/features/guest/marketing/showcase/components/ShowcaseMotion';
import { useShowcaseStyle } from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { formatShowcaseAddress } from '@/features/guest/marketing/showcase/lib/showcaseLocation';
import { resolveShowcaseMotionReduced } from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';

import { cn } from '@/lib/utils';

type Props = {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
  headingClassName?: string;
  layout?: 'split' | 'stack';
};

function openDirections(data: ShowcaseData) {
  if (data.mapsUrl?.trim()) {
    window.open(data.mapsUrl.trim(), '_blank', 'noopener,noreferrer');
    return;
  }
  const fullAddress = formatShowcaseAddress(data);
  if (data.latitude != null && data.longitude != null) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }
  if (fullAddress) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}

export function ShowcaseLocationSection({
  data,
  section,
  headingClassName,
  layout = 'split',
}: Props) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const motionReduced = resolveShowcaseMotionReduced(data.config, data.reducedMotion, data.embed);
  const fullAddress = formatShowcaseAddress(data);
  const areaLabel = [data.locationLabel, data.state, data.country].filter(Boolean).join(', ');

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className="@sm:py-24 scroll-mt-20 py-16"
    >
      <div
        className={cn(
          '@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4',
          layout === 'split' && '@lg:grid-cols-2 @lg:items-start grid gap-8'
        )}
      >
        <ShowcaseReveal reduced={motionReduced}>
          <h2
            className={cn(
              displayFontClass,
              headingClassName ?? '@sm:text-4xl text-3xl font-semibold tracking-tight'
            )}
          >
            {section.heading}
          </h2>
          <p className={cn('mt-3 text-base font-medium', tokens.body)}>{areaLabel}</p>
          {fullAddress ? (
            <p className={cn('mt-2 max-w-md text-base leading-relaxed', tokens.muted)}>
              {fullAddress}
            </p>
          ) : null}
          {section.body && section.body !== fullAddress && section.body !== data.address ? (
            <p className={cn('mt-3 max-w-md text-base leading-relaxed', tokens.body)}>
              {section.body}
            </p>
          ) : null}
        </ShowcaseReveal>

        <ShowcaseReveal reduced={motionReduced} delay={0.08}>
          <div className="relative overflow-hidden rounded-2xl">
            <div className="@sm:min-h-[360px] relative min-h-[260px]">
              <ShowcaseMapEmbed
                className="absolute inset-0 size-full"
                latitude={data.latitude}
                longitude={data.longitude}
                placeId={data.placeId}
                address={fullAddress}
              />
            </div>
            <button
              type="button"
              onClick={() => openDirections(data)}
              className={cn(
                'absolute bottom-4 left-4 z-10 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium shadow-md',
                tokens.primaryBtn
              )}
            >
              <Navigation className="size-4" aria-hidden />
              Directions
            </button>
          </div>
        </ShowcaseReveal>
      </div>
    </section>
  );
}
