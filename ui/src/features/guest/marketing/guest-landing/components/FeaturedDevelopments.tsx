import { useRef } from 'react';

import { Link } from 'react-router-dom';

import { motion, useInView } from 'framer-motion';
import { MapPin, Star, Building2, Home, Layers, ArrowRight } from 'lucide-react';

import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import type { Development, DevelopmentType } from '@/features/guest/marketing/developments/types';
import { MarketingImage as Image } from '@/features/guest/marketing/shared/components/MarketingImage';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEVELOPMENT_TYPE_BADGE } from '@/lib/status-tone-colors';

const TYPE_CONFIG: Record<
  DevelopmentType,
  { label: string; color: string; icon: typeof Building2 }
> = {
  CONDOMINIUM: {
    label: 'Condo',
    color: DEVELOPMENT_TYPE_BADGE.CONDOMINIUM,
    icon: Building2,
  },
  SUBDIVISION: {
    label: 'Subdivision',
    color: DEVELOPMENT_TYPE_BADGE.SUBDIVISION,
    icon: Home,
  },
  MIXED_USE: {
    label: 'Mixed-Use',
    color: DEVELOPMENT_TYPE_BADGE.MIXED_USE,
    icon: Layers,
  },
  TOWNHOUSE: {
    label: 'Townhouse',
    color: DEVELOPMENT_TYPE_BADGE.TOWNHOUSE,
    icon: Home,
  },
  COMMERCIAL: {
    label: 'Commercial',
    color: DEVELOPMENT_TYPE_BADGE.COMMERCIAL,
    icon: Building2,
  },
};

const FEATURED = mockDevelopments.slice(0, 4);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturedDevelopments() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-border from-muted/20 to-background border-t bg-gradient-to-b py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <motion.span
              initial={{ opacity: 0, x: -16 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 }}
              className="bg-primary/10 text-primary mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            >
              <Building2 className="h-3.5 w-3.5" />
              Featured Developments
            </motion.span>
            <h2 className="text-foreground text-3xl font-bold lg:text-4xl">
              Live in a premier community
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Browse condominiums, subdivisions, and mixed-use developments from the
              Philippines&rsquo; most trusted names in real estate.
            </p>
          </div>
          <Button variant="outline" className="group gap-2 self-start" asChild>
            <Link to="/developments">
              View all developments
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURED.map((development) => (
            <DevelopmentMiniCard key={development.id} development={development} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function DevelopmentMiniCard({ development }: { development: Development }) {
  const typeConfig = TYPE_CONFIG[development.type];
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div variants={itemVariants} className="group">
      <Link to={`/developments/${development.slug}`}>
        <div className="border-border bg-card hover:border-primary/20 overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={development.coverImage}
              alt={development.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            {/* Type badge */}
            <div className="absolute left-3 top-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm',
                  typeConfig.color,
                  'bg-background/80'
                )}
              >
                <TypeIcon className="h-3 w-3" />
                {typeConfig.label}
              </span>
            </div>

            {/* Unit count */}
            <div className="absolute bottom-3 right-3 translate-y-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {development.propertyCount} homes
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="text-foreground group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors lg:text-base">
                {development.name}
              </h3>
              {development.rating && (
                <div className="flex shrink-0 items-center gap-0.5 text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-foreground font-medium">{development.rating}</span>
                </div>
              )}
            </div>
            <div className="text-muted-foreground mb-3 flex items-center gap-1 text-xs lg:text-sm">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{development.city}</span>
              <span className="mx-1">·</span>
              <span className="text-muted-foreground/70 shrink-0">{development.developerName}</span>
            </div>
            <div className="border-border flex items-center justify-between border-t pt-3">
              <div className="text-sm">
                <span className="text-muted-foreground">From </span>
                <span className="text-foreground font-bold">
                  ₱{development.priceRange.min.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-xs">/night</span>
              </div>
              <span className="text-primary flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                Explore
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
