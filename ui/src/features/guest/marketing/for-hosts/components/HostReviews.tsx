import { useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

import {
  hostTestimonials,
  type HostTestimonial,
} from '@/features/guest/marketing/for-hosts/data/hostTestimonials';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function HostAvatar({ testimonial }: { testimonial: HostTestimonial }) {
  return (
    <div
      className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-md"
      aria-hidden
    >
      {testimonial.name.charAt(0)}
    </div>
  );
}

export function HostReviews() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = hostTestimonials[activeIndex];

  const goTo = (index: number) => {
    setActiveIndex((index + hostTestimonials.length) % hostTestimonials.length);
  };

  if (!active) return null;

  return (
    <section id="reviews" className="scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="text-primary mb-3 text-xs font-bold uppercase tracking-[0.2em]">
              Host stories
            </p>
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
              Built for the work hosts do every day
            </h2>
            <div className="mt-8 flex items-center gap-2">
              {hostTestimonials.map((testimonial, index) => (
                <button
                  key={testimonial.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Show review from ${testimonial.name}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className="focus-visible:ring-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <span
                    className={cn(
                      'block h-2.5 rounded-full transition-all',
                      index === activeIndex ? 'bg-primary w-7' : 'bg-muted-foreground/30 w-2.5'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Quote
              className="text-primary/10 absolute -left-4 -top-7 h-20 w-20 sm:-left-8 sm:-top-10 sm:h-28 sm:w-28"
              aria-hidden
            />
            <AnimatePresence mode="wait">
              <motion.article
                key={active.id}
                initial={reduceMotion ? false : { opacity: 0, x: 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -36 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                className="border-border bg-card relative min-h-[330px] rounded-3xl border p-6 shadow-xl sm:p-9 lg:p-11"
              >
                <div className="mb-7 flex gap-1" aria-label={`${active.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        'h-4 w-4',
                        index < active.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted'
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="text-foreground text-xl font-medium leading-relaxed sm:text-2xl">
                  “{active.quote}”
                </blockquote>
                <div className="mt-9 flex items-center gap-3">
                  <HostAvatar testimonial={active} />
                  <div>
                    <p className="text-foreground font-bold">{active.name}</p>
                    <p className="text-muted-foreground text-sm">{active.role}</p>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous host review"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-[44px] min-w-[44px] rounded-full"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next host review"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
