import { ListingHeroSearch } from '@/features/guest/marketing/shared/components/ListingHeroSearch';

/**
 * Search hero — same pattern as PropertiesHero / DevelopmentsHero.
 * ListingScrollSearchProvider portals the real bar; this section only
 * reserves the morph anchor under the fixed marketing nav (`pt-20`).
 */
export function SearchResultsHeader() {
  return (
    <section className="border-border bg-background border-b pt-20">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ListingHeroSearch redirectTo="/search" />
      </div>
    </section>
  );
}
