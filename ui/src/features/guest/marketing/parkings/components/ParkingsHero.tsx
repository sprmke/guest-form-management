import { ListingHeroSearch } from '@/features/guest/marketing/shared/components/ListingHeroSearch';

export function ParkingsHero() {
  return (
    <section className="border-border bg-background border-b pt-20">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ListingHeroSearch redirectTo="/parkings" />
      </div>
    </section>
  );
}
