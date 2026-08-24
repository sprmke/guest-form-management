import { useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';
import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface StayGuideHeroProps {
  guide: GuestStayGuideDto;
}

export function StayGuideHero({ guide }: StayGuideHeroProps) {
  const reduceMotion = useReducedMotion();
  const [logoFailed, setLogoFailed] = useState(false);
  const unitLabel = guide.property.towerAndUnit?.trim() || guide.property.name;
  const propertyName = guide.property.name.trim();
  const heroImage = guide.property.heroImageUrl;

  return (
    <header
      id="stay-guide-hero"
      data-page-editor-anchor="stay-guide-hero"
      className="@2xl:h-[68vh] relative h-[62vh] max-h-[620px] min-h-[420px] w-full overflow-hidden"
    >
      {heroImage ? (
        <motion.div
          className="absolute inset-0"
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          <Image src={heroImage} alt="" fill className="object-cover" priority sizes="100vw" />
        </motion.div>
      ) : (
        <div className="from-primary/30 via-primary/10 to-muted/40 flex h-full w-full items-center justify-center bg-gradient-to-br">
          <span className="text-primary/40 text-7xl font-semibold tracking-tight">
            {propertyName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/80"
        aria-hidden
      />

      <div className="@2xl:px-6 @5xl:px-8 absolute inset-x-0 top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex min-h-[56px] max-w-[720px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {guide.property.logoUrl && !logoFailed ? (
              <span className="@2xl:size-10 size-9 shrink-0 overflow-hidden rounded-md bg-white/15 shadow-sm">
                <img
                  src={guide.property.logoUrl}
                  alt=""
                  className="size-full object-cover object-center"
                  onError={() => setLogoFailed(true)}
                />
              </span>
            ) : (
              <span className="@2xl:size-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white/20 text-sm font-bold text-white shadow-sm backdrop-blur-sm">
                {propertyName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="@2xl:block hidden truncate text-sm font-medium text-white/90">
              {propertyName}
            </span>
          </div>
          <ThemeToggle className="border-white/25 bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/40 hover:bg-white/20 hover:text-white" />
        </div>
      </div>

      <div className="@2xl:px-6 @5xl:px-8 @2xl:pb-20 absolute inset-x-0 bottom-0 z-20 px-4 pb-14">
        <motion.div
          className="mx-auto max-w-[720px] text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        >
          <p className="@2xl:text-xs text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
            Stay guide
          </p>
          <h1 className="font-fraunces @2xl:text-5xl @5xl:text-[3.25rem] @5xl:leading-[1.05] mt-2 text-4xl font-semibold tracking-tight text-white drop-shadow-md">
            {unitLabel}
          </h1>
        </motion.div>
      </div>
    </header>
  );
}
