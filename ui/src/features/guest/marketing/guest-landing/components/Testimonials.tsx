import { useRef, useState } from 'react';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    id: 1,
    name: 'Maria Santos',
    location: 'Quezon City',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    rating: 5,
    property: 'Sunset Beach Villa, Boracay',
    text: "Absolutely stunning property! The villa exceeded all our expectations. The view was breathtaking, and the host was incredibly accommodating. We'll definitely be coming back!",
    date: 'December 2025',
  },
  {
    id: 2,
    name: 'John Rivera',
    location: 'Makati City',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    rating: 5,
    property: 'Modern Makati Condo',
    text: 'Perfect location for business travelers. The condo was spotless, modern, and had everything I needed. The check-in process was seamless. Highly recommend!',
    date: 'January 2026',
  },
  {
    id: 3,
    name: 'Ana Cruz',
    location: 'Cebu City',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
    rating: 5,
    property: 'Tagaytay Hillside Retreat',
    text: 'A magical escape from the city! The cool weather, amazing views of Taal, and the cozy house made our family vacation unforgettable. The kids loved it!',
    date: 'November 2025',
  },
  {
    id: 4,
    name: 'Miguel Garcia',
    location: 'Davao City',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    rating: 5,
    property: 'Palawan Beachfront Paradise',
    text: 'This place is paradise on earth! Crystal clear waters, private beach access, and impeccable service. Worth every peso. A true 5-star experience!',
    date: 'October 2025',
  },
];

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="bg-muted relative overflow-hidden py-20 lg:py-32 dark:bg-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="bg-primary/10 absolute left-1/4 top-0 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-0 right-1/4 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1 }}
            className="bg-primary/20 text-primary mb-4 inline-block rounded-full px-3 py-1 text-sm font-medium"
          >
            Guest Reviews
          </motion.span>
          <h2 className="text-foreground mb-4 text-3xl font-bold lg:text-4xl dark:text-white">
            Loved by travelers
          </h2>
          <p className="text-muted-foreground dark:text-slate-400">
            Don&apos;t just take our word for it. Here&apos;s what our guests have to say about
            their experiences.
          </p>
        </motion.div>

        {/* Testimonials Carousel */}
        <div className="mx-auto max-w-4xl">
          <div className="relative">
            {/* Quote icon */}
            <div className="absolute -top-6 left-8 lg:left-12">
              <Quote className="text-primary/20 h-16 w-16" />
            </div>

            {/* Testimonial Cards */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="border-border bg-card rounded-3xl border p-8 shadow-sm backdrop-blur-sm lg:p-12 dark:border-slate-700 dark:bg-slate-800/50"
              >
                {(() => {
                  const testimonial = testimonials[activeIndex];
                  if (!testimonial) return null;

                  return (
                    <>
                      <div className="mb-6 flex gap-1">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>

                      <p className="text-foreground mb-8 text-lg leading-relaxed lg:text-xl dark:text-white">
                        &ldquo;{testimonial.text}&rdquo;
                      </p>

                      <p className="text-primary mb-6 text-sm">Stayed at: {testimonial.property}</p>

                      <div className="flex items-center gap-4">
                        <div className="ring-primary/50 relative h-14 w-14 overflow-hidden rounded-full ring-2">
                          <Image
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-foreground font-semibold dark:text-white">
                            {testimonial.name}
                          </p>
                          <p className="text-muted-foreground text-sm dark:text-slate-400">
                            {testimonial.location} · {testimonial.date}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition-all duration-300',
                      index === activeIndex
                        ? 'bg-primary w-8'
                        : 'bg-muted-foreground/40 hover:bg-muted-foreground/60 dark:bg-slate-600 dark:hover:bg-slate-500'
                    )}
                  />
                ))}
              </div>

              {/* Arrows */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevTestimonial}
                  className="border-border bg-muted text-foreground hover:bg-muted/80 rounded-full dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextTestimonial}
                  className="border-border bg-muted text-foreground hover:bg-muted/80 rounded-full dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
