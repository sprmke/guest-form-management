import { Car, DoorOpen, KeyRound, LogOut, ScrollText, type LucideIcon } from 'lucide-react';

import { StayGuideSection } from '@/features/guest/stay-guide/components/StayGuideSection';
import type { GuestStayGuideDto, StayGuideSectionDto } from '@/features/guest/stay-guide/lib/api';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface StayGuideTabsProps {
  sections: StayGuideSectionDto[];
  property: Pick<GuestStayGuideDto['property'], 'location' | 'towerAndUnit'>;
}

const TAB_META: Record<string, { short: string; icon: LucideIcon }> = {
  'check-in-instructions': { short: 'Check-in', icon: KeyRound },
  'house-rules': { short: 'House rules', icon: ScrollText },
  'parking-reminders': { short: 'Parking', icon: Car },
  'check-out-instructions': { short: 'Check-out', icon: LogOut },
};

function tabLabel(section: StayGuideSectionDto): string {
  const meta = TAB_META[section.key];
  if (meta) return meta.short;
  const label = section.displayHeading?.trim() || section.label;
  return label.length <= 18 ? label : `${label.slice(0, 16)}…`;
}

function tabIcon(section: StayGuideSectionDto): LucideIcon {
  return TAB_META[section.key]?.icon ?? DoorOpen;
}

function tabGridClass(count: number): string {
  if (count <= 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-4';
}

export function StayGuideTabs({ sections, property }: StayGuideTabsProps) {
  if (sections.length === 0) return null;

  const defaultValue = sections[0]!.key;

  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <div className="bg-background/95 border-border/50 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <TabsList
            className={cn(
              'bg-muted/45 grid h-auto w-full gap-1 rounded-2xl p-1',
              tabGridClass(sections.length)
            )}
          >
            {sections.map((section) => {
              const Icon = tabIcon(section);
              const label = tabLabel(section);
              return (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  className={cn(
                    'text-muted-foreground flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2',
                    'text-[11px] font-semibold leading-tight transition-colors',
                    'data-[state=active]:text-foreground',
                    'sm:min-h-[48px] sm:flex-row sm:gap-2 sm:px-3 sm:text-sm'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" aria-hidden />
                  <span className="max-w-full text-center leading-snug">{label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {sections.map((section) => (
          <TabsContent
            key={section.key}
            value={section.key}
            className="mt-0 focus-visible:outline-none"
          >
            <StayGuideSection
              section={section}
              propertyLocation={property.location}
              towerAndUnit={property.towerAndUnit}
            />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
