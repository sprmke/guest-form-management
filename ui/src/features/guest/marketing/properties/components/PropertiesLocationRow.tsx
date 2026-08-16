import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PropertyCard, type Property } from './PropertyCard';

interface PropertiesLocationRowProps {
  title: string;
  /** Path to flat location browse page (e.g. `/properties/in/tagaytay`) */
  viewAllTo: string;
  properties: Property[];
}

export function PropertiesLocationRow({
  title,
  viewAllTo,
  properties,
}: PropertiesLocationRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
      ro.disconnect();
    };
  }, [properties]);

  const scrollByCards = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-property-carousel-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.75;
    el.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };

  if (properties.length === 0) return null;

  return (
    <section className="min-w-0 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={viewAllTo}
          className="text-foreground group/title inline-flex min-h-[44px] items-center gap-1.5 text-lg font-semibold tracking-tight sm:text-xl"
        >
          <span>{title}</span>
          <ChevronRight
            className="h-5 w-5 shrink-0 transition-transform group-hover/title:translate-x-0.5"
            aria-hidden="true"
          />
          <span className="sr-only">View all</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={cn(
              'border-border bg-background text-foreground flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-opacity',
              canScrollLeft ? 'hover:bg-muted opacity-100' : 'cursor-default opacity-40'
            )}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={cn(
              'border-border bg-background text-foreground flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-opacity',
              canScrollRight ? 'hover:bg-muted opacity-100' : 'cursor-default opacity-40'
            )}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex min-w-0 gap-4 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {properties.map((property, index) => (
          <div
            key={property.id}
            data-property-carousel-card
            className="w-[240px] shrink-0 sm:w-[260px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <PropertyCard property={property} index={index} variant="carousel" />
          </div>
        ))}
      </div>
    </section>
  );
}
