import { Link } from 'react-router-dom';

import { ArrowRight, CreditCard } from 'lucide-react';

import { HostPricingStarterCard } from '@/features/guest/marketing/for-hosts/components/HostPricingStarterCard';
import { MarketingPublicCallout } from '@/features/guest/marketing/shared/components/MarketingPublicCallout';
import { MarketingPublicPageContent } from '@/features/guest/marketing/shared/components/MarketingPublicPageContent';
import { MarketingPublicPageHero } from '@/features/guest/marketing/shared/components/MarketingPublicPageHero';

import { Button } from '@/components/ui/button';

export function ForHostsPricingPage() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingPublicPageHero
        eyebrow="For Hosts"
        title="Free to start on one property"
        description="Run your first listing at no cost. Add properties, parking, or team members from the dashboard when you are ready to grow."
        blobPosition="right"
        narrow
      />

      <MarketingPublicPageContent narrow>
        <HostPricingStarterCard />

        <MarketingPublicCallout
          variant="inset"
          className="mt-10"
          icon={CreditCard}
          title="More than one property or parking?"
          body={
            <>
              Organization and parking features unlock from the host dashboard after sign-up.
              Questions before you start?{' '}
              <Link to="/contact" className="text-primary font-medium hover:underline">
                Contact us
              </Link>
              .
            </>
          }
          actions={
            <>
              <Button variant="outline" className="min-h-[44px] rounded-full" asChild>
                <Link to="/for-hosts">Back to overview</Link>
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 min-h-[44px] rounded-full text-white"
                asChild
              >
                <Link to="/for-hosts/login">
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </>
          }
        />
      </MarketingPublicPageContent>
    </div>
  );
}
