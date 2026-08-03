import { useMemo } from 'react';

import { ChevronDown, ExternalLink } from 'lucide-react';

import { absoluteGuestPath } from '@/features/guest/lib/guestPublicPaths';
import { buildPropertyGuestPublicPages } from '@/features/dashboard/property/lib/propertyGuestPublicPages';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Props = {
  propertySlug: string;
  propertyId: string;
  className?: string;
};

export function PropertyGuestPagesMenu({ propertySlug, propertyId, className }: Props) {
  const pages = useMemo(
    () => buildPropertyGuestPublicPages(propertySlug, propertyId),
    [propertySlug, propertyId]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open guest pages"
          className={cn(
            'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 sm:px-3.5',
            'gradient-primary text-primary-foreground shadow-soft text-[13px] font-semibold',
            'hover:shadow-primary-glow transition-all duration-200 motion-safe:active:scale-[0.98]',
            className
          )}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Guest pages</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
        </button>
      </DropdownMenuTrigger>
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
