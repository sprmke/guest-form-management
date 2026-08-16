import type { HeroSearchValues } from '@/features/guest/marketing/guest-landing/components/HeroSearch';
import { ListingHeroSearch } from '@/features/guest/marketing/shared/components/ListingHeroSearch';

interface ParkingHeroProps {
  redirectTo: string;
  onSearch?: (values: HeroSearchValues) => void;
}

export function ParkingHero({ redirectTo, onSearch }: ParkingHeroProps) {
  return (
    <section className="border-border bg-background border-b pt-20">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ListingHeroSearch onSearch={onSearch} redirectTo={redirectTo} />
      </div>
    </section>
  );
}
