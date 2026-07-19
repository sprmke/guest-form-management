import { motion } from 'framer-motion';

import {
  HeroSearch,
  type HeroSearchField,
  type HeroSearchValues,
} from '@/features/guest/marketing/guest-landing/components/HeroSearch';
import { useListingScrollSearchOptional } from '@/features/guest/marketing/shared/context/ListingScrollSearchContext';
import { useListingSearchDefaultLocation } from '@/features/guest/marketing/shared/lib/listingSearchDefaultLocation';
import { useListingSearchFields } from '@/features/guest/marketing/shared/lib/listingSearchFields';

import { cn } from '@/lib/utils';

export type { HeroSearchValues as PropertySearchState };

interface ListingHeroSearchProps {
  onSearch?: (values: HeroSearchValues) => void;
  redirectTo?: string;
  className?: string;
  fields?: HeroSearchField[];
}

export function ListingHeroSearch({
  onSearch,
  redirectTo = '/properties',
  className,
  fields: fieldsProp,
}: ListingHeroSearchProps) {
  const scrollSearch = useListingScrollSearchOptional();
  const morphEnabled = scrollSearch?.enabled ?? false;
  const routeDefaultLocation = useListingSearchDefaultLocation();
  const routeFields = useListingSearchFields();
  const defaultLocation = scrollSearch?.defaultLocation ?? routeDefaultLocation;
  const fields = fieldsProp ?? scrollSearch?.fields ?? routeFields;

  if (morphEnabled && scrollSearch) {
    return (
      <motion.div
        className={cn('w-full lg:mx-auto lg:max-w-3xl', className)}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div ref={scrollSearch.heroAnchorRef} className="h-14 w-full lg:h-[92px]" aria-hidden />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn('mx-auto w-full max-w-3xl', className)}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <HeroSearch
        redirectTo={redirectTo}
        defaultLocation={defaultLocation}
        onSearch={onSearch}
        fields={fields}
      />
    </motion.div>
  );
}
