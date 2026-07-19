import { CalendarRange } from 'lucide-react';

import { StayGuideGalleryCarousel } from '@/features/guest/stay-guide/components/StayGuideGalleryCarousel';
import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

interface StayGuideHeroProps {
  guide: GuestStayGuideDto;
}

function formatStayDates(checkIn: string, checkOut: string): string {
  const normalize = (raw: string) => {
    const t = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    if (/^\d{2}-\d{2}-\d{4}$/.test(t)) {
      const [m, d, y] = t.split('-');
      return `${y}-${m}-${d}`;
    }
    return t;
  };
  const inYmd = normalize(checkIn);
  const outYmd = normalize(checkOut);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const inDate = inYmd.includes('-') ? fmt.format(new Date(`${inYmd}T12:00:00Z`)) : checkIn;
  const outDate = outYmd.includes('-') ? fmt.format(new Date(`${outYmd}T12:00:00Z`)) : checkOut;
  return `${inDate} – ${outDate}`;
}

function resolveGalleryImages(guide: GuestStayGuideDto): string[] {
  const fromApi = guide.property.galleryImages?.filter((url) => url.trim()) ?? [];
  if (fromApi.length > 0) return fromApi;
  return guide.property.images.filter((url) => url.trim());
}

export function StayGuideHero({ guide }: StayGuideHeroProps) {
  const galleryImages = resolveGalleryImages(guide);
  const unitLabel = guide.property.towerAndUnit?.trim() || guide.property.name;
  const propertyName = guide.property.name.trim();
  const stayDates = formatStayDates(guide.booking.checkInDate, guide.booking.checkOutDate);

  return (
    <header className="relative">
      <div className="relative w-full overflow-hidden">
        <StayGuideGalleryCarousel
          images={galleryImages}
          propertyName={propertyName}
          className="aspect-[4/5] max-h-[min(78vh,720px)] sm:aspect-[16/10] lg:aspect-[21/9]"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-black/85"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[56px] max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {guide.property.logoUrl ? (
                <img
                  src={guide.property.logoUrl}
                  alt=""
                  className="h-8 w-auto max-w-[120px] shrink-0 rounded-md bg-white/95 object-contain p-1 shadow-sm sm:h-9"
                />
              ) : (
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white shadow-sm backdrop-blur-sm">
                  {propertyName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden truncate text-sm font-medium text-white/90 sm:block">
                {propertyName}
              </span>
            </div>
            <ThemeToggle className="text-white hover:bg-white/15 hover:text-white" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70 sm:text-xs">
              Stay guide
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
              {unitLabel}
            </h1>

            <div className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {guide.booking.guestName ? (
                <span className="bg-white/18 inline-flex w-fit max-w-full rounded-full px-4 py-2 text-base font-semibold text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md sm:text-lg">
                  Welcome, {guide.booking.guestName}
                </span>
              ) : null}

              {stayDates ? (
                <span
                  className={cn(
                    'inline-flex min-h-[44px] w-fit max-w-full items-center gap-2 rounded-full px-4 py-2',
                    'bg-black/40 text-sm font-medium text-white/95 ring-1 ring-white/20 backdrop-blur-md sm:text-[15px]'
                  )}
                >
                  <CalendarRange className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{stayDates}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
