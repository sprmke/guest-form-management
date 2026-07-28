import { Link } from 'react-router-dom';

import { MapPin, Star, BadgeCheck, ArrowUpRight } from 'lucide-react';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

import { cn } from '@/lib/utils';

export interface PropertyPageHeaderProps {
  /** Property slug used to build the link back to property detail */
  propertySlug: string;
  propertyName: string;
  propertyLocation?: string;
  propertyImage?: string | null;
  rating?: number;
  reviews?: number;
  hostName?: string;
  isSuperhost?: boolean;
  /** e.g. "Availability Calendar" or "Guest Form" */
  pageLabel: string;
  /** Optional badge slot rendered below the card */
  badge?: React.ReactNode;
  /** Props passed from pages but intentionally not rendered in the header */
  checkInTime?: string;
  checkOutTime?: string;
  propertyType?: string;
  guests?: number;
  bedrooms?: number;
  className?: string;
  /** Overrides the auto-generated `/properties/[slug]` back link */
  backUrl?: string;
  /** Overrides the "View property" hint text (e.g. "View development") */
  backLabel?: string;
}

export function PropertyPageHeader({
  propertySlug,
  propertyName,
  propertyLocation,
  propertyImage,
  rating,
  reviews,
  hostName,
  isSuperhost,
  pageLabel,
  badge,
  className,
  backUrl,
  backLabel,
}: PropertyPageHeaderProps) {
  const resolvedBackLabel = backLabel ?? 'View property';

  return (
    <div className={cn('w-full', className)}>
      <Link
        to={backUrl ?? `/properties/${propertySlug}`}
        className="border-border bg-card hover:border-primary/30 focus-visible:ring-ring group block rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label={`${resolvedBackLabel} — ${propertyName}`}
      >
        <div className="flex items-center gap-4 p-4 sm:p-5">
          {/* Property image */}
          {propertyImage && (
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
              <Image
                src={propertyImage}
                alt={propertyName}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"

                priority
              />
            </div>
          )}

          {/* Property info */}
          <div className="min-w-0 flex-1">
            {/* Page label + link hint */}
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                {pageLabel}
              </span>
              <span className="text-muted-foreground/50 group-hover:text-primary/70 flex items-center gap-1 text-[11px] transition-colors">
                {resolvedBackLabel}
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>

            {/* Property name */}
            <p className="text-foreground group-hover:text-primary truncate text-base font-bold tracking-tight transition-colors sm:text-lg">
              {propertyName}
            </p>

            {/* Meta row: location · rating · host */}
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {propertyLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{propertyLocation}</span>
                </span>
              )}
              {rating !== undefined && reviews !== undefined && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-foreground font-medium">{rating}</span>
                    <span>({reviews})</span>
                  </span>
                </>
              )}
              {hostName && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1">
                    {isSuperhost && (
                      <BadgeCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>{hostName}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {badge && <div className="mt-3 flex justify-center">{badge}</div>}
    </div>
  );
}
