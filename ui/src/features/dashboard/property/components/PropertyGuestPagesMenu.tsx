import { useMemo, useState } from 'react';

import { ChevronDown, ExternalLink } from 'lucide-react';

import { absoluteGuestPath } from '@/features/guest/lib/guestPublicPaths';
import { buildPropertyGuestPublicPages } from '@/features/dashboard/property/lib/propertyGuestPublicPages';

import { MobileChoiceItem, MobileChoiceSheet } from '@/components/mobile/MobileChoiceSheet';
import { mobileHeroActionClassName } from '@/components/mobile/MobileHeroActionButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type Props = {
  propertySlug: string;
  propertyId: string;
  className?: string;
  /** Icon-only trigger beside the tenant switcher on the mobile brand hero. */
  variant?: 'default' | 'heroIcon';
};

export function PropertyGuestPagesMenu({
  propertySlug,
  propertyId,
  className,
  variant = 'default',
}: Props) {
  const pages = useMemo(
    () => buildPropertyGuestPublicPages(propertySlug, propertyId),
    [propertySlug, propertyId]
  );
  const isMobileLayout = useIsBelowLg();
  const [sheetOpen, setSheetOpen] = useState(false);

  const heroIcon = variant === 'heroIcon';

  const trigger = (
    <button
      type="button"
      aria-label="Open guest pages"
      aria-expanded={isMobileLayout ? sheetOpen : undefined}
      aria-haspopup={isMobileLayout ? 'dialog' : undefined}
      onClick={isMobileLayout ? () => setSheetOpen(true) : undefined}
      className={cn(
        heroIcon
          ? mobileHeroActionClassName
          : cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 sm:px-3.5',
              'gradient-primary text-primary-foreground shadow-soft text-[13px] font-semibold',
              'hover:shadow-primary-glow transition-all duration-200 motion-safe:active:scale-[0.98]'
            ),
        className
      )}
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden />
      {heroIcon ? null : (
        <>
          <span className="hidden sm:inline">Guest pages</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
        </>
      )}
    </button>
  );

  if (isMobileLayout) {
    return (
      <>
        {trigger}
        <MobileChoiceSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Guest pages">
          <div role="listbox" aria-label="Guest pages">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <MobileChoiceItem
                  key={page.id}
                  label={page.label}
                  icon={<Icon className="size-5" aria-hidden />}
                  onSelect={() => {
                    window.open(absoluteGuestPath(page.path), '_blank', 'noopener,noreferrer');
                    setSheetOpen(false);
                  }}
                />
              );
            })}
          </div>
        </MobileChoiceSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {pages.map((page) => {
          const Icon = page.icon;
          return (
            <DropdownMenuItem key={page.id} asChild>
              <a href={absoluteGuestPath(page.path)} target="_blank" rel="noopener noreferrer">
                <Icon className="size-4" aria-hidden />
                {page.label}
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
