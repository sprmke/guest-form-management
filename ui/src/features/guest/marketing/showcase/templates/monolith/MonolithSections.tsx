import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

import { ShowcaseCanvas } from '@/features/guest/marketing/showcase/components/ShowcaseCanvas';
import { ShowcaseGalleryStrip } from '@/features/guest/marketing/showcase/components/ShowcaseGalleryStrip';
import { ShowcaseHostSection } from '@/features/guest/marketing/showcase/components/ShowcaseHostSection';
import { ShowcaseLocationSection } from '@/features/guest/marketing/showcase/components/ShowcaseLocationSection';
import {
  AmenityMarquee,
  AnimatedStat,
  ShowcaseReveal,
} from '@/features/guest/marketing/showcase/components/ShowcaseMotion';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { useShowcaseStyle } from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import { useShowcaseContainedChrome } from '@/features/guest/marketing/showcase/lib/showcaseChrome';
import {
  resolveShowcaseHeroOverlayClass,
  showcaseAccentHsla,
} from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';
import { cn } from '@/lib/utils';

function SpotlightHero({
  data,
  section,
}: {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
}) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const containedChrome = useShowcaseContainedChrome(data.embed);
  const ref = useRef<HTMLElement>(null);
  const hasImage = Boolean(section.images[0]);
  const x = useMotionValue(50);
  const y = useMotionValue(40);
  const spotlightColor = showcaseAccentHsla(data.accentColor, hasImage ? 0.38 : 0.22);
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${x}% ${y}%, ${spotlightColor}, transparent 55%)`;
  const canvasOff = data.embed || data.reducedMotion || !data.config.motion.canvas;
  const pointerOk = !data.reducedMotion && data.config.motion.intensity !== 'subtle';
  const overlayClass = resolveShowcaseHeroOverlayClass(data.config.palette.overlay);

  useEffect(() => {
    if (!pointerOk || !ref.current) return;
    const el = ref.current;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(((event.clientX - rect.left) / rect.width) * 100);
      y.set(((event.clientY - rect.top) / rect.height) * 100);
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [pointerOk, x, y]);

  return (
    <section
      ref={ref}
      id={section.id}
      data-page-editor-anchor={section.id}
      className={cn(
        'relative flex scroll-mt-20 flex-col justify-end overflow-hidden',
        containedChrome ? 'min-h-[min(100dvh,720px)]' : 'min-h-[100dvh]',
        hasImage ? 'bg-neutral-950 text-neutral-50' : tokens.page
      )}
    >
      {section.images[0] ? (
        <img
          src={section.images[0]}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-45"
          fetchPriority="high"
        />
      ) : null}
      <ShowcaseCanvas variant="grain" paused={canvasOff} className="opacity-70" />
      {hasImage ? <div className={cn('absolute inset-0 bg-gradient-to-t', overlayClass)} /> : null}
      {pointerOk ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: spotlight }}
        />
      ) : null}
      <div
        className={cn(
          '@sm:px-6 @lg:px-8 relative z-10 mx-auto w-full max-w-6xl px-4 pb-14',
          containedChrome ? 'pt-6' : '@sm:pb-16 pt-28'
        )}
      >
        <p
          className={cn(
            'text-sm uppercase tracking-[0.2em]',
            hasImage ? 'text-white/60' : tokens.muted
          )}
        >
          {data.locationLabel}
        </p>
        <h1
          className={cn(
            displayFontClass,
            '@sm:text-6xl @lg:text-[5.5rem] mt-3 max-w-5xl text-[clamp(1.75rem,7vw,2.5rem)] leading-[0.95] tracking-[-0.03em]'
          )}
        >
          {section.heading === 'Your stay' ? data.propertyName : section.heading}
        </h1>
        {section.subheading ? (
          <p
            className={cn(
              '@sm:text-lg mt-4 max-w-xl text-base leading-relaxed',
              hasImage ? 'text-white/80' : tokens.body
            )}
          >
            {section.subheading}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={data.formPath}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center justify-center px-7 text-sm font-medium uppercase tracking-[0.14em]',
              tokens.primaryBtn
            )}
          >
            {section.ctaLabel || 'Request stay'}
          </Link>
          <Link
            to={data.calendarPath}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center justify-center border px-7 text-sm font-medium uppercase tracking-[0.14em]',
              hasImage ? 'border-white/30 text-white' : tokens.secondaryBtn
            )}
          >
            Check dates
          </Link>
        </div>
      </div>
      {data.amenities.length > 0 ? (
        <div className="relative z-10">
          <AmenityMarquee
            items={data.amenities.slice(0, 12)}
            borderClassName={tokens.marqueeBorder}
          />
        </div>
      ) : null}
    </section>
  );
}

export function MonolithSections({ data }: { data: ShowcaseData }) {
  const { tokens } = useShowcaseTheme();
  const hero = data.sections.find((s) => s.id === 'hero');

  return (
    <div className="font-sans">
      {hero ? <SpotlightHero data={data} section={hero} /> : null}

      {data.sections
        .filter((s) => s.id !== 'hero')
        .map((section, index) => {
          if (section.id === 'gallery') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className={cn('@sm:py-24 scroll-mt-20 border-t py-16', tokens.sectionBorder)}
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-instrument @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <div className={cn('mt-5 border', tokens.galleryFrame)}>
                    <ShowcaseGalleryStrip
                      images={section.images}
                      propertyName={data.propertyName}
                      className="gap-0"
                      imageClassName={tokens.galleryImageBorder}
                    />
                  </div>
                </div>
              </section>
            );
          }

          if (section.id === 'highlights') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className={cn('@sm:py-24 scroll-mt-20 border-t py-16', tokens.sectionBorder)}
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-instrument @sm:text-5xl text-3xl tracking-tight">
                      Highlights
                    </h2>
                  </ShowcaseReveal>
                  <div className="@sm:grid-cols-2 @lg:grid-cols-4 mt-5 grid grid-cols-1 gap-6">
                    {data.highlights.map((item) => {
                      const [value, ...rest] = item.split(' ');
                      return (
                        <AnimatedStat
                          key={item}
                          value={value || item}
                          label={rest.join(' ') || item}
                          reduced={data.reducedMotion}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          }

          if (section.id === 'amenities') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className={cn('@sm:py-24 scroll-mt-20 border-t py-16', tokens.sectionBorder)}
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-instrument @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <ul
                    className={cn(
                      '@sm:grid-cols-2 mt-5 grid grid-cols-1 gap-0 border',
                      tokens.cardBorder
                    )}
                  >
                    {data.amenities.map((item) => (
                      <li key={item} className={cn('min-w-0 text-base', tokens.amenityCell)}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          }

          if (section.id === 'cta') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className={cn('@sm:py-28 scroll-mt-20 border-t py-20', tokens.sectionBorder)}
              >
                <div className="@sm:px-6 mx-auto max-w-5xl px-4 text-center">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-instrument @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <Link
                        to={data.formPath}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center justify-center px-8 text-sm font-medium uppercase tracking-[0.14em]',
                          tokens.primaryBtn
                        )}
                      >
                        {section.ctaLabel || 'Book now'}
                      </Link>
                      <Link
                        to={data.calendarPath}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center justify-center border px-8 text-sm font-medium uppercase tracking-[0.14em]',
                          tokens.secondaryBtn
                        )}
                      >
                        View calendar
                      </Link>
                    </div>
                  </ShowcaseReveal>
                </div>
              </section>
            );
          }

          if (section.id === 'location') {
            return (
              <ShowcaseLocationSection
                key={section.id}
                data={data}
                section={section}
                headingClassName="font-instrument @sm:text-5xl text-3xl tracking-tight"
              />
            );
          }

          if (section.id === 'host') {
            return (
              <ShowcaseHostSection
                key={section.id}
                data={data}
                section={section}
                headingClassName="font-instrument @sm:text-5xl text-3xl tracking-tight"
              />
            );
          }

          return <MonolithGeneric key={section.id} data={data} section={section} index={index} />;
        })}
    </div>
  );
}

function MonolithGeneric({
  data,
  section,
  index,
}: {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
  index: number;
}) {
  const { tokens } = useShowcaseTheme();

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className={cn(
        '@sm:py-24 scroll-mt-20 border-t py-16',
        tokens.sectionBorder,
        index % 2 === 1 && tokens.sectionAlt
      )}
    >
      <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
        <ShowcaseReveal reduced={data.reducedMotion}>
          <h2 className="font-instrument @sm:text-5xl text-3xl tracking-tight">
            {section.heading}
          </h2>
          {section.subheading ? (
            <p className={cn('mt-2 max-w-2xl text-base', tokens.subheading)}>
              {section.subheading}
            </p>
          ) : null}
        </ShowcaseReveal>
        {section.id === 'testimonials' ? (
          <div className="@md:grid-cols-2 mt-5 grid grid-cols-1 gap-4">
            {(data.testimonials.length > 0
              ? data.testimonials
              : [{ id: 'empty', author: 'Guests', body: 'Reviews will appear here.', rating: null }]
            ).map((item) => (
              <blockquote key={item.id} className={tokens.testimonialBlock}>
                <p className={tokens.testimonialQuote}>{item.body}</p>
                <footer
                  className={cn(
                    'mt-4 text-sm uppercase tracking-[0.12em]',
                    tokens.testimonialFooter
                  )}
                >
                  {item.author}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
        {section.body && section.id !== 'testimonials' ? (
          <p className={cn('@sm:text-lg mt-5 max-w-2xl text-base leading-relaxed', tokens.body)}>
            {section.body}
          </p>
        ) : null}
      </div>
    </section>
  );
}
