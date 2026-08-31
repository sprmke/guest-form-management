import type { CSSProperties } from 'react';

import { DoorOpen, LogOut } from 'lucide-react';

import { ShowcaseSectionIntro } from '@/features/guest/marketing/showcase/components/ShowcaseSectionIntro';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import {
  showcaseChapterSectionPyClass,
  showcaseSectionPyClass,
} from '@/features/guest/marketing/showcase/lib/showcaseSectionLayout';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';
import { StayGuideCheckInDocumentsSection } from '@/features/guest/stay-guide/components/StayGuideCheckInDocumentsSection';
import { StayGuideRichContent } from '@/features/guest/stay-guide/components/StayGuideRichContent';

import { cn } from '@/lib/utils';
import { formatStayBoundaryDateShort, formatTimeToAMPM } from '@/utils/format/dates';

type Props = {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
  containerClassName?: string;
  headingClassName?: string;
  alt?: boolean;
};

function PassDates({ data }: { data: ShowcaseData }) {
  const pass = data.stayGuide?.pass;
  if (!pass) return null;
  return (
    <div className="border-border bg-background overflow-hidden rounded-[1.75rem] border">
      <div className="@sm:flex-row @sm:items-stretch flex flex-col">
        <div className="@sm:border-b-0 @sm:border-r flex min-w-0 flex-1 flex-col gap-1 border-b border-dashed p-5">
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            Guest
          </span>
          <span className="text-foreground truncate text-2xl font-semibold">
            {pass.guestName.trim() || 'Guest'}
          </span>
          {data.propertyName ? (
            <span className="text-muted-foreground truncate text-sm">{data.propertyName}</span>
          ) : null}
        </div>
        <div className="@sm:gap-4 flex min-w-0 flex-1 items-center gap-3 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-primary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
              <DoorOpen className="size-3" aria-hidden />
              Check-in
            </p>
            <p className="text-foreground truncate text-lg font-semibold">
              {formatStayBoundaryDateShort(pass.checkInDate)}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatTimeToAMPM(pass.checkInTime, true)}
            </p>
          </div>
          <LogOut className="text-primary/50 @sm:block hidden size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-primary flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
              <LogOut className="size-3" aria-hidden />
              Check-out
            </p>
            <p className="text-foreground truncate text-lg font-semibold">
              {formatStayBoundaryDateShort(pass.checkOutDate)}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatTimeToAMPM(pass.checkOutTime, false)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shared Stay Guide body renderer used by every Showcase template shell. */
export function StayGuideTemplatedSection({
  data,
  section,
  containerClassName,
  headingClassName = 'text-3xl font-semibold tracking-tight',
  alt = false,
}: Props) {
  const { tokens } = useShowcaseTheme();

  if (section.kind === 'quickNav') return null;

  const isChapter = section.kind === 'chapter';
  const pyClass = isChapter ? showcaseChapterSectionPyClass : showcaseSectionPyClass;

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className={cn(pyClass, alt && tokens.sectionAlt)}
      style={
        section.accentColor
          ? ({ ['--primary' as string]: section.accentColor } as CSSProperties)
          : undefined
      }
    >
      <div className={containerClassName}>
        {section.kind === 'passCard' ? (
          <PassDates data={data} />
        ) : section.kind === 'checkInDocuments' ? (
          <StayGuideCheckInDocumentsSection documents={data.stayGuide?.checkInDocuments ?? []} />
        ) : section.kind === 'host' ? (
          <ShowcaseSectionIntro
            section={section}
            headingClassName={headingClassName}
            tokens={tokens}
          />
        ) : (
          <>
            <ShowcaseSectionIntro
              section={section}
              headingClassName={headingClassName}
              tokens={tokens}
              showBody={!section.bodyHtml && !section.blocks?.length}
            />
            {section.blocks?.length ? (
              section.blocks.map((block) => (
                <div key={block.key} className="mt-6">
                  {block.heading ? (
                    <h3 className="text-foreground mb-2 text-lg font-semibold">{block.heading}</h3>
                  ) : null}
                  {block.imageUrl ? (
                    <img
                      src={block.imageUrl}
                      alt=""
                      className="border-border mb-4 max-h-72 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  <StayGuideRichContent html={block.html} />
                </div>
              ))
            ) : section.bodyHtml ? (
              <div className="mt-5">
                <StayGuideRichContent html={section.bodyHtml} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
