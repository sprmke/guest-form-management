import { useReducedMotion } from 'framer-motion';
import {
  BadgeCheck,
  Building2,
  CarFront,
  Megaphone,
  Package,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';

import { ListingHeroSearch } from '@/features/guest/marketing/shared/components/ListingHeroSearch';

import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

const servicePreviews = [
  { label: 'Become a property manager', icon: Building2, enterDelay: '', floatDelay: '0s' },
  {
    label: 'Become an agent',
    icon: BadgeCheck,
    enterDelay: 'animation-delay-100',
    floatDelay: '0.6s',
  },
  {
    label: 'Market properties',
    icon: Megaphone,
    enterDelay: 'animation-delay-150',
    floatDelay: '1.2s',
  },
  { label: 'Maintenance', icon: Wrench, enterDelay: 'animation-delay-200', floatDelay: '1.8s' },
  {
    label: 'Food & Essentials',
    icon: UtensilsCrossed,
    enterDelay: 'animation-delay-300',
    floatDelay: '2.4s',
  },
  { label: 'Supplies', icon: Package, enterDelay: 'animation-delay-400', floatDelay: '3s' },
  {
    label: 'Transportation',
    icon: CarFront,
    enterDelay: 'animation-delay-500',
    floatDelay: '3.6s',
  },
] as const;

export function ServicesPage() {
  usePageTitle(publicPageTitle('Services'));
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-background min-h-screen">
      <section className="border-border bg-background border-b pt-20">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <ListingHeroSearch />
        </div>
      </section>

      <div className="relative isolate flex min-h-[34rem] items-center justify-center overflow-hidden px-4 py-16 sm:min-h-[40rem] sm:px-6 lg:px-8">
        <div
          className="bg-primary/10 pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-80 sm:w-80"
          aria-hidden
        />
        <div
          className="border-primary/10 pointer-events-none absolute left-1/2 top-1/2 -z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border sm:h-72 sm:w-72"
          aria-hidden
        />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
          <section aria-labelledby="services-title" className="animate-fade-in-up">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.28em]">
              Services
            </span>
            <h1
              id="services-title"
              className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl"
            >
              Coming Soon
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-sm leading-6 sm:text-base">
              Thoughtful extras for every part of your stay.
            </p>
          </section>

          <ul
            className="mt-10 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 sm:mt-12 sm:gap-3"
            aria-hidden
          >
            {servicePreviews.map(({ label, icon: Icon, enterDelay, floatDelay }) => (
              <li key={label} className={cn('animate-fade-in-up opacity-0', enterDelay)}>
                <span
                  className={cn(
                    'border-border bg-card/90 text-card-foreground inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-md backdrop-blur sm:px-4 sm:py-2.5 sm:text-sm',
                    !reduceMotion && 'animate-float'
                  )}
                  style={reduceMotion ? undefined : { animationDelay: floatDelay }}
                >
                  <Icon className="text-primary h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
