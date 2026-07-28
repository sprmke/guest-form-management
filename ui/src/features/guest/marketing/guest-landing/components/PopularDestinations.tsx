import { useRef } from 'react';

import { Link } from 'react-router-dom';

import { motion, useInView } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { editorialDestinations } from '@/features/guest/marketing/guest-landing/data/landingContent';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

export function PopularDestinations() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="bg-muted/30 py-14 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45 }}
          className="mb-8 max-w-xl"
        >
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Explore by destination
          </h2>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {editorialDestinations.map((destination, index) => (
            <motion.div
              key={destination.id}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <Link
                to={`/properties?location=${destination.id}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl md:aspect-[3/4]"
              >
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="text-sm text-white/75">{destination.tagline}</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{destination.name}</h3>
                      <p className="mt-1 text-sm text-white/70">{destination.properties}+ stays</p>
                    </div>
                    <span className="border-border/30 bg-background/15 group-hover:bg-background/25 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border backdrop-blur-sm transition-colors">
                      <ArrowUpRight className="h-5 w-5 text-white" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
