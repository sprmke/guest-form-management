import { Link } from 'react-router-dom';

import { ArrowRight, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

const starterBullets = [
  'No credit card required',
  'Free for one property',
  'Cancel anytime',
] as const;

const starterIncludes = [
  'Booking workflow and guest forms',
  'Document review and status automation',
  'Email automations and inbox where configured',
  'Finance and maintenance modules',
  'Guest inbox and team permissions',
] as const;

export function HostPricingStarterCard() {
  return (
    <article className="border-border bg-card rounded-3xl border p-6 shadow-lg sm:p-10">
      <div className="border-border border-b pb-6">
        <p className="text-primary text-xs font-bold uppercase tracking-[0.28em]">Starter</p>
        <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Free for one property
        </h2>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          Operate bookings, documents, and day-to-day hosting on a single listing. Upgrade when you
          add properties, parking, or organization features.
        </p>
      </div>

      <ul className="mt-6 space-y-3">
        {starterBullets.map((item) => (
          <li key={item} className="text-muted-foreground flex items-start gap-2 text-sm">
            <CheckCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <p className="text-foreground text-sm font-semibold">Includes</p>
        <ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-relaxed">
          {starterIncludes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <Button
        size="lg"
        className="bg-primary hover:bg-primary/90 shadow-primary/30 mt-8 min-h-[52px] w-full rounded-full font-semibold text-white shadow-lg sm:w-auto sm:px-8"
        asChild
      >
        <Link to="/for-hosts/login">
          Start free
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
        </Link>
      </Button>
    </article>
  );
}
