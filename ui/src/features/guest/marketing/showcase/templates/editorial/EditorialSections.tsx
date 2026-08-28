import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ShowcaseCanvas } from '@/features/guest/marketing/showcase/components/ShowcaseCanvas';
import { ShowcaseGalleryStrip } from '@/features/guest/marketing/showcase/components/ShowcaseGalleryStrip';
import { ShowcaseHostSection } from '@/features/guest/marketing/showcase/components/ShowcaseHostSection';
import { ShowcaseLocationSection } from '@/features/guest/marketing/showcase/components/ShowcaseLocationSection';
import { ShowcaseReveal } from '@/features/guest/marketing/showcase/components/ShowcaseMotion';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { useShowcaseStyle } from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import { useShowcaseContainedChrome } from '@/features/guest/marketing/showcase/lib/showcaseChrome';
import { resolveShowcaseMotionReduced } from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';

import { cn } from '@/lib/utils';

function EditorialHero({
  data,
  section,
}: {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
}) {
  const { tokens, mode } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const containedChrome = useShowcaseContainedChrome(data.embed);
  const motionReduced = resolveShowcaseMotionReduced(data.config, data.reducedMotion, data.embed);
  const images = section.images.length > 0 ? section.images : [];
  const canvasOff = data.embed || data.reducedMotion || !data.config.motion.canvas;
  const placeholders =
    mode === 'dark'
      ? ['bg-[#2a241c]', 'bg-[#252019]', 'bg-[#1f1a15]']
      : ['bg-[#ddd6c8]', 'bg-[#e7e0d4]', 'bg-[#d6cfc2]'];

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className={cn(
        '@sm:px-6 @lg:px-8 relative scroll-mt-20 overflow-hidden px-4',
        containedChrome ? 'pb-12 pt-4' : '@sm:pb-20 @sm:pt-28 pb-14 pt-24'
      )}
    >
      <ShowcaseCanvas variant="grain" paused={canvasOff} className="opacity-30" />
      <div className="@lg:grid-cols-12 @lg:items-end @lg:gap-10 relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6">
        <div className="@lg:col-span-5 min-w-0">
          <ShowcaseReveal reduced={motionReduced}>
            <p className={cn('text-base tracking-[0.06em]', tokens.muted)}>{data.locationLabel}</p>
            <h1
              className={cn(
                displayFontClass,
                '@sm:text-6xl @lg:text-7xl mt-3 text-[clamp(1.875rem,7vw,2.75rem)] leading-[0.98] tracking-tight'
              )}
            >
              {section.heading === 'Your stay' ? data.propertyName : section.heading}
            </h1>
            {section.subheading ? (
              <p className={cn('mt-4 max-w-md text-base leading-relaxed', tokens.body)}>
                {section.subheading}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={data.formPath}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-7 text-base font-medium transition-opacity duration-200 hover:opacity-90',
                  tokens.primaryBtn
                )}
              >
                {section.ctaLabel || 'Request stay'}
              </Link>
              <Link
                to={data.calendarPath}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-7 text-base font-medium',
                  tokens.secondaryBtn
                )}
              >
                Check dates
              </Link>
            </div>
          </ShowcaseReveal>
        </div>
        <div className="@sm:grid-cols-2 @lg:col-span-7 @sm:gap-3 @lg:gap-4 grid grid-cols-1 gap-2">
          <motion.div
            className="@sm:col-span-1 @sm:row-span-2 @sm:aspect-auto @sm:min-h-[200px] @lg:min-h-[320px] relative aspect-[16/10] overflow-hidden rounded-sm"
            initial={data.reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {images[0] ? (
              <img src={images[0]} alt="" className="size-full object-cover" fetchPriority="high" />
            ) : (
              <div className={cn('size-full', placeholders[0])} />
            )}
          </motion.div>
          <motion.div
            className="relative aspect-[4/5] overflow-hidden rounded-sm"
            initial={data.reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {images[1] ? (
              <img src={images[1]} alt="" className="size-full object-cover" />
            ) : (
              <div className={cn('size-full', placeholders[1])} />
            )}
          </motion.div>
          <motion.div
            className="relative aspect-[4/3] overflow-hidden rounded-sm"
            initial={data.reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {images[2] ? (
              <img src={images[2]} alt="" className="size-full object-cover" />
            ) : (
              <div className={cn('size-full', placeholders[2])} />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCarousel({ data }: { data: ShowcaseData }) {
  const { tokens } = useShowcaseTheme();
  const items =
    data.testimonials.length > 0
      ? data.testimonials
      : [{ id: 'empty', author: 'Guests', body: 'Reviews will appear here.', rating: null }];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: items.length > 1,
    align: 'start',
    skipSnaps: false,
  });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (data.reducedMotion || data.embed) {
    return (
      <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <blockquote
            key={item.id}
            className={cn(
              'min-w-[min(100%,280px)] max-w-sm shrink-0 rounded-md p-6',
              tokens.testimonialCard
            )}
          >
            <p className={tokens.testimonialQuote}>{item.body}</p>
            <footer
              className={cn('mt-4 text-sm uppercase tracking-[0.1em]', tokens.testimonialFooter)}
            >
              {item.author}
            </footer>
          </blockquote>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {items.map((item) => (
            <blockquote
              key={item.id}
              className={cn(
                '@sm:basis-[60%] @lg:basis-[42%] min-w-0 shrink-0 grow-0 basis-[88%] rounded-md p-6',
                tokens.testimonialCard
              )}
            >
              <p className={tokens.testimonialQuote}>{item.body}</p>
              <footer
                className={cn('mt-4 text-sm uppercase tracking-[0.1em]', tokens.testimonialFooter)}
              >
                {item.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
      {items.length > 1 ? (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className={cn(
              'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border',
              tokens.testimonialControl
            )}
            aria-label="Previous review"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(
              'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border',
              tokens.testimonialControl
            )}
            aria-label="Next review"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <p className={cn('text-sm uppercase tracking-[0.12em]', tokens.muted)}>
            {selected + 1} / {items.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function EditorialSections({ data }: { data: ShowcaseData }) {
  const { tokens } = useShowcaseTheme();
  const hero = data.sections.find((s) => s.id === 'hero');

  return (
    <div className="font-sans">
      {hero ? <EditorialHero data={data} section={hero} /> : null}

      {data.sections
        .filter((s) => s.id !== 'hero')
        .map((section) => {
          if (section.id === 'gallery') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className="@sm:py-24 scroll-mt-20 py-16"
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-cormorant @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <div className="mt-5">
                    <ShowcaseGalleryStrip
                      images={section.images}
                      propertyName={data.propertyName}
                      imageClassName="rounded-sm"
                    />
                  </div>
                </div>
              </section>
            );
          }

          if (section.id === 'testimonials') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className="@sm:py-24 scroll-mt-20 py-16"
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-cormorant @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <TestimonialCarousel data={data} />
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
                headingClassName="font-cormorant @sm:text-5xl text-3xl tracking-tight"
              />
            );
          }

          if (section.id === 'host') {
            return (
              <ShowcaseHostSection
                key={section.id}
                data={data}
                section={section}
                headingClassName="font-cormorant @sm:text-5xl text-3xl tracking-tight"
              />
            );
          }

          if (section.id === 'cta') {
            return (
              <section
                key={section.id}
                id={section.id}
                data-page-editor-anchor={section.id}
                className="@sm:py-28 scroll-mt-20 py-20"
              >
                <div className="@sm:px-6 mx-auto max-w-3xl px-4 text-center">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="font-cormorant @sm:text-5xl text-3xl tracking-tight">
                      {section.heading}
                    </h2>
                    {section.subheading ? (
                      <p className={cn('mx-auto mt-3 max-w-md text-base', tokens.subheading)}>
                        {section.subheading}
                      </p>
                    ) : null}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <Link
                        to={data.formPath}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-7 text-base font-medium',
                          tokens.primaryBtn
                        )}
                      >
                        {section.ctaLabel || 'Book now'}
                      </Link>
                      <Link
                        to={data.calendarPath}
                        className={cn(
                          'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-7 text-base font-medium',
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

          return <EditorialGeneric key={section.id} data={data} section={section} />;
        })}
    </div>
  );
}

function EditorialGeneric({
  data,
  section,
}: {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
}) {
  const { tokens } = useShowcaseTheme();

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className="@sm:py-24 scroll-mt-20 py-16"
    >
      <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
        <ShowcaseReveal reduced={data.reducedMotion}>
          <h2 className="font-cormorant @sm:text-5xl text-3xl tracking-tight">{section.heading}</h2>
          {section.subheading ? (
            <p className={cn('mt-2 max-w-2xl text-base', tokens.subheading)}>
              {section.subheading}
            </p>
          ) : null}
        </ShowcaseReveal>
        {section.id === 'amenities' ? (
          <ul className="@sm:columns-2 @lg:columns-3 mt-5 columns-1 gap-8">
            {data.amenities.map((item) => (
              <li
                key={item}
                className={cn('mb-3 break-inside-avoid text-base', tokens.amenityCell)}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {section.id === 'highlights' ? (
          <ul className="@sm:grid-cols-2 @lg:grid-cols-4 mt-5 grid grid-cols-1 gap-3">
            {data.highlights.map((item) => (
              <li
                key={item}
                className={cn(
                  'min-w-0 px-4 py-5 text-base leading-snug tracking-tight',
                  tokens.highlightCard
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {section.body && section.id !== 'amenities' && section.id !== 'highlights' ? (
          <p className={cn('@sm:text-lg mt-5 max-w-2xl text-base leading-relaxed', tokens.body)}>
            {section.body}
          </p>
        ) : null}
      </div>
    </section>
  );
}
