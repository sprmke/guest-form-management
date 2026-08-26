import { useState } from 'react';

import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface StayGuideCompactHeaderProps {
  guide: GuestStayGuideDto;
}

/**
 * Lightweight top chrome when the hero is hidden — keeps logo + theme toggle
 * and gives the page a proper top inset so content is not flush to the viewport.
 */
export function StayGuideCompactHeader({ guide }: StayGuideCompactHeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const propertyName = guide.property.name.trim();

  return (
    <header
      id="stay-guide-chrome"
      data-page-editor-anchor="stay-guide-chrome"
      className="@2xl:px-6 @5xl:px-8 border-b border-[#171717]/10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-[#FAFAFA]/10"
    >
      <div className="mx-auto flex min-h-[56px] max-w-[720px] items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {guide.property.logoUrl && !logoFailed ? (
            <span className="@2xl:size-10 size-9 shrink-0 overflow-hidden rounded-md bg-[#F5F5F5] shadow-sm dark:bg-[#262626]">
              <img
                src={guide.property.logoUrl}
                alt=""
                className="size-full object-cover object-center"
                onError={() => setLogoFailed(true)}
              />
            </span>
          ) : (
            <span className="@2xl:size-10 bg-primary/15 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-bold shadow-sm">
              {propertyName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="@2xl:block hidden truncate text-sm font-medium text-[#171717] dark:text-[#FAFAFA]">
            {propertyName}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
