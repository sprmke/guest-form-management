import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { ShowcaseCanvas } from '@/features/guest/marketing/showcase/components/ShowcaseCanvas';
import { ShowcaseGalleryStrip } from '@/features/guest/marketing/showcase/components/ShowcaseGalleryStrip';
import { ShowcaseHostSection } from '@/features/guest/marketing/showcase/components/ShowcaseHostSection';
import { ShowcaseLocationSection } from '@/features/guest/marketing/showcase/components/ShowcaseLocationSection';
import {
  MagneticCta,
  ShowcaseReveal,
} from '@/features/guest/marketing/showcase/components/ShowcaseMotion';
import { useSmoothScroll } from '@/features/guest/marketing/showcase/components/SmoothScrollProvider';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { useShowcaseStyle } from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import { useShowcaseContainedChrome } from '@/features/guest/marketing/showcase/lib/showcaseChrome';
import {
  resolveShowcaseHeroOverlayClass,
  resolveShowcaseParallaxEnabled,
  resolveShowcaseMotionReduced,
} from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import { useScrollSpy } from '@/features/guest/marketing/showcase/hooks/useScrollSpy';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';
import { cn } from '@/lib/utils';

function ProgressRail({ data }: { data: ShowcaseData }) {
  const { scrollToAnchor } = useSmoothScroll();
  const { tokens } = useShowcaseTheme();
  const containedChrome = useShowcaseContainedChrome(data.embed);
  const ids = data.sections.map((s) => s.id);
  const active = useScrollSpy(ids);

  if (containedChrome) return null;

  return (
    <aside
      className="@lg:block pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2"
      aria-label="Section progress"
    >
      <div className="pointer-events-auto flex flex-col gap-2">
        {data.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToAnchor(section.id)}
            className={cn(
              'h-8 w-1.5 cursor-pointer rounded-full transition-all duration-300',
              active === section.id ? tokens.progressActive : tokens.progressInactive
            )}
            aria-label={`Go to ${section.heading}`}
          />
        ))}
      </div>
    </aside>
  );
}

function AuroraHero({ data, section }: { data: ShowcaseData; section: ShowcaseResolvedSection }) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const containedChrome = useShowcaseContainedChrome(data.embed);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15]);
  const canvasOff = data.embed || data.reducedMotion || !data.config.motion.canvas;
  const parallaxOff = !resolveShowcaseParallaxEnabled(data.config, data.reducedMotion, data.embed);
  const overlayClass = resolveShowcaseHeroOverlayClass(data.config.palette.overlay);

  return (
    <section
      ref={ref}
      id={section.id}
      data-page-editor-anchor={section.id}
      className={cn(
        'relative flex scroll-mt-20 flex-col justify-end overflow-hidden',
        containedChrome ? 'min-h-[min(100dvh,720px)]' : 'min-h-[100dvh]'
      )}
    >
      {section.images[0] ? (
        <motion.div
          className="absolute inset-0"
          style={parallaxOff ? undefined : { y: imageY, scale: 1.12 }}
        >
          <img
            src={section.images[0]}
            alt=""
            className="size-full object-cover"
            fetchPriority="high"
          />
        </motion.div>
      ) : (
        <div className="from-primary/30 via-background to-muted absolute inset-0 bg-gradient-to-br" />
      )}
      <ShowcaseCanvas variant="mesh" paused={canvasOff} />
      <div className={cn('absolute inset-0 bg-gradient-to-t', overlayClass)} />
      <motion.div
        className={cn(
          '@sm:px-6 @sm:pb-20 @lg:px-8 relative z-10 mx-auto w-full max-w-6xl px-4 pb-16',
          containedChrome ? 'pt-6' : '@sm:pt-32 pt-28'
        )}
        style={parallaxOff ? undefined : { y: textY, opacity }}
      >
        <p className="mb-3 max-w-xl text-base text-white/80">{data.locationLabel}</p>
        <h1
          className={cn(
            displayFontClass,
            '@sm:text-5xl @lg:text-[5rem] @lg:leading-[0.95] max-w-4xl text-[clamp(1.75rem,8vw,2.5rem)] font-semibold tracking-[-0.03em] text-white'
          )}
        >
          {section.heading === 'Your stay' ? data.propertyName : section.heading}
        </h1>
        {section.subheading ? (
          <p className="@sm:text-lg mt-4 max-w-xl text-base leading-relaxed text-white/90">
            {section.subheading}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <MagneticCta reduced={data.reducedMotion}>
            <Link
              to={data.formPath}
              className={cn(
                'bg-primary text-primary-foreground inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-7 text-base font-medium',
                tokens.primaryBtn
              )}
            >
              {section.ctaLabel || 'Request stay'}
            </Link>
          </MagneticCta>
          <MagneticCta reduced={data.reducedMotion}>
            <Link
              to={data.calendarPath}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-7 text-base font-medium transition-colors duration-200',
                tokens.heroSecondaryBtn
              )}
            >
              Check dates
            </Link>
          </MagneticCta>
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70"
        animate={data.reducedMotion ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      >
        <ChevronDown className="size-5" aria-hidden />
      </motion.div>
    </section>
  );
}

function GenericSection({
  data,
  section,
}: {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
}) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const motionReduced = resolveShowcaseMotionReduced(data.config, data.reducedMotion, data.embed);
  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className="@sm:py-24 scroll-mt-20 py-16"
    >
      <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
        <ShowcaseReveal reduced={motionReduced}>
          <h2
            className={cn(displayFontClass, '@sm:text-4xl text-3xl font-semibold tracking-tight')}
          >
            {section.heading}
          </h2>
          {section.subheading ? (
            <p className={cn('mt-2 max-w-2xl text-base leading-relaxed', tokens.subheading)}>
              {section.subheading}
            </p>
          ) : null}
        </ShowcaseReveal>
        {section.id === 'highlights' ? (
          <ul className="@sm:grid-cols-2 @lg:grid-cols-4 mt-5 grid grid-cols-1 gap-3">
            {data.highlights.map((item) => (
              <li
                key={item}
                className={cn(
                  'min-w-0 rounded-2xl border px-4 py-5 text-base font-medium leading-snug tracking-tight',
                  tokens.highlightCard
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {section.id === 'testimonials' ? (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
            {(data.testimonials.length > 0
              ? data.testimonials
              : [{ id: 'empty', author: 'Guests', body: 'Reviews will appear here.', rating: null }]
            ).map((item) => (
              <blockquote
                key={item.id}
                className={cn(
                  'min-w-[min(100%,280px)] max-w-sm shrink-0 rounded-2xl border p-6',
                  tokens.testimonialCard
                )}
              >
                <p className="text-base leading-relaxed">{item.body}</p>
                <footer className={cn('mt-4 text-sm', tokens.testimonialFooter)}>
                  {item.author}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
        {section.body && section.id !== 'highlights' && section.id !== 'testimonials' ? (
          <p className={cn('@sm:text-lg mt-5 max-w-2xl text-base leading-relaxed', tokens.body)}>
            {section.body}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function AuroraSections({ data }: { data: ShowcaseData }) {
  const { tokens } = useShowcaseTheme();
  const hero = data.sections.find((s) => s.id === 'hero');

  return (
    <>
      <ProgressRail data={data} />
      {hero ? <AuroraHero data={data} section={hero} /> : null}

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
                    <h2 className="@sm:text-4xl text-3xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <div className="mt-5">
                    <ShowcaseGalleryStrip
                      images={section.images}
                      propertyName={data.propertyName}
                      imageClassName="rounded-2xl"
                    />
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
                className="@sm:py-24 scroll-mt-20 py-16"
              >
                <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="@sm:text-4xl text-3xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                  </ShowcaseReveal>
                  <ul className="@sm:grid-cols-2 @lg:grid-cols-3 mt-5 grid grid-cols-1 gap-3">
                    {data.amenities.map((item, index) => (
                      <ShowcaseReveal
                        key={item}
                        reduced={data.reducedMotion}
                        delay={Math.min(index * 0.04, 0.28)}
                      >
                        <li
                          className={cn(
                            'group min-h-11 min-w-0 rounded-2xl border px-5 py-4 text-base transition-all duration-300 hover:-translate-y-0.5',
                            tokens.amenityCell
                          )}
                        >
                          {item}
                        </li>
                      </ShowcaseReveal>
                    ))}
                  </ul>
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
                headingClassName="@sm:text-4xl text-3xl font-semibold tracking-tight"
              />
            );
          }

          if (section.id === 'host') {
            return (
              <ShowcaseHostSection
                key={section.id}
                data={data}
                section={section}
                headingClassName="@sm:text-4xl text-3xl font-semibold tracking-tight"
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
                <div
                  className={cn(
                    '@sm:px-10 @sm:py-16 mx-auto max-w-4xl rounded-[2rem] px-6 py-14 text-center',
                    tokens.ctaSurface
                  )}
                >
                  <ShowcaseReveal reduced={data.reducedMotion}>
                    <h2 className="@sm:text-4xl text-3xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    {section.subheading ? (
                      <p
                        className={cn(
                          'mx-auto mt-3 max-w-xl text-base leading-relaxed',
                          tokens.subheading
                        )}
                      >
                        {section.subheading}
                      </p>
                    ) : null}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <MagneticCta reduced={data.reducedMotion}>
                        <Link
                          to={data.formPath}
                          className={cn(
                            'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-7 text-base font-medium',
                            tokens.primaryBtn
                          )}
                        >
                          {section.ctaLabel || 'Book now'}
                        </Link>
                      </MagneticCta>
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

          return <GenericSection key={section.id} data={data} section={section} />;
        })}
    </>
  );
}
