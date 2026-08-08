import { Link } from 'react-router-dom';

import { ArrowRight, Building2 } from 'lucide-react';

import { MarketingPublicCallout } from '@/features/guest/marketing/shared/components/MarketingPublicCallout';

import { Button } from '@/components/ui/button';

export function HostClosingCta() {
  return (
    <MarketingPublicCallout
      variant="band"
      icon={Building2}
      title="Ready to run your first property?"
      body={
        <>
          Start free on one listing. See{' '}
          <Link to="/for-hosts/pricing" className="text-primary font-medium hover:underline">
            pricing
          </Link>{' '}
          for what is included, then create your account when you are ready.
        </>
      }
      actions={
        <>
          <Button variant="outline" className="min-h-[44px] rounded-full" asChild>
            <Link to="/for-hosts/pricing">View pricing</Link>
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
  );
}
