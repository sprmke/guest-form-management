import { motion, useReducedMotion } from 'framer-motion';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import { StayGuideCheckInLocation } from '@/features/guest/stay-guide/components/StayGuideCheckInLocation';
import { StayGuideRichContent } from '@/features/guest/stay-guide/components/StayGuideRichContent';
import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';
import type { StayGuideChapterDef } from '@/features/guest/stay-guide/lib/stayGuideChapters';

import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';

interface StayGuideChapterProps {
  chapter: StayGuideChapterDef;
  propertyLocation: GuestStayGuideDto['property']['location'];
  towerAndUnit: string | null;
  /** Optional host accent; falls back to theme primary. */
  accentColor?: string | null;
}

export function StayGuideChapter({
  chapter,
  propertyLocation,
  towerAndUnit,
  accentColor,
}: StayGuideChapterProps) {
  const reduceMotion = useReducedMotion();
  const Icon = chapter.icon;
  const showCheckInMap = chapter.id === 'getting-in';
  const accent = (accentColor ?? chapter.accentColor)?.trim() || null;
  const accentStyle = accent ? ({ color: accent } as const) : undefined;

  return (
    <section id={chapter.id} className="scroll-mt-24 sm:scroll-mt-28">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15%' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <span
            className={
              accent
                ? 'flex size-9 shrink-0 items-center justify-center rounded-full'
                : 'bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full'
            }
            style={accent ? { backgroundColor: `${accent}1A`, color: accent } : undefined}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <p
              className={
                accent
                  ? 'text-[11px] font-bold uppercase tracking-[0.2em]'
                  : 'text-primary text-[11px] font-bold uppercase tracking-[0.2em]'
              }
              style={accentStyle}
            >
              {chapter.eyebrow}
            </p>
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl dark:text-[#FAFAFA]">
              {chapter.heading}
            </h2>
          </div>
        </div>

        <div className="space-y-5 rounded-3xl border border-[#171717]/10 bg-white p-5 sm:p-8 dark:border-[#FAFAFA]/10 dark:bg-[#0A0A0A]">
          {chapter.sections.map((section, index) => {
            const hasImage = Boolean(section.imageUrl?.trim());
            const imageSrc = hasImage
              ? withStorageUrlCacheBust(section.imageUrl!, section.imageUpdatedAt || null)
              : null;
            const heading = section.displayHeading?.trim() || section.label;

            return (
              <div
                key={section.key}
                className={
                  index > 0
                    ? 'border-t border-[#171717]/10 pt-5 dark:border-[#FAFAFA]/10'
                    : undefined
                }
              >
                {imageSrc ? (
                  <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl">
                    <Image
                      key={section.imageUpdatedAt ?? section.imageUrl}
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}
                {heading ? (
                  <h3
                    className={
                      accent
                        ? 'mb-2 text-base font-semibold tracking-tight sm:text-lg'
                        : 'text-primary mb-2 text-base font-semibold tracking-tight sm:text-lg'
                    }
                    style={accentStyle}
                  >
                    {heading}
                  </h3>
                ) : null}
                <StayGuideRichContent html={section.html} />
              </div>
            );
          })}
        </div>

        {showCheckInMap && propertyLocation ? (
          <StayGuideCheckInLocation location={propertyLocation} towerAndUnit={towerAndUnit} />
        ) : null}
      </motion.div>
    </section>
  );
}
