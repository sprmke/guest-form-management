import { Link } from 'react-router-dom';

import { ShieldCheck, Star } from 'lucide-react';

import { featuredGuestReview } from '@/features/guest/marketing/guest-landing/data/landingContent';
import { Button } from '@/components/ui/button';

export function LandingSocialProof() {
  return (
    <section className="border-border bg-background border-t py-14 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12">
          <div className="border-border bg-card rounded-3xl border p-6 sm:p-8">
            <div className="mb-4 flex gap-1">
              {Array.from({ length: featuredGuestReview.rating }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              ))}
            </div>
            <blockquote className="text-foreground text-lg leading-relaxed sm:text-xl">
              &ldquo;{featuredGuestReview.quote}&rdquo;
            </blockquote>
            <footer className="text-muted-foreground mt-5 text-sm">
              <p className="text-foreground font-medium">{featuredGuestReview.name}</p>
              <p>{featuredGuestReview.stay}</p>
            </footer>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-foreground font-semibold">Verified listings</p>
                <p className="text-muted-foreground text-sm">
                  Every property is reviewed before it goes live.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-6">
              <div>
                <p className="text-foreground text-2xl font-bold">4.9</p>
                <p className="text-muted-foreground text-xs">Guest rating</p>
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">1K+</p>
                <p className="text-muted-foreground text-xs">Stays</p>
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">50+</p>
                <p className="text-muted-foreground text-xs">Destinations</p>
              </div>
            </div>

            <Button className="min-h-[44px] rounded-full px-6" asChild>
              <Link to="/properties">Start exploring</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
