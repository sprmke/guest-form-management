import { Link } from 'react-router-dom';

import { Building2, LifeBuoy, Mail, MapPin, Phone, Users } from 'lucide-react';

import { MarketingPublicIconCard } from '@/features/guest/marketing/shared/components/MarketingPublicIconCard';
import { MarketingPublicPageContent } from '@/features/guest/marketing/shared/components/MarketingPublicPageContent';
import { MarketingPublicPageHero } from '@/features/guest/marketing/shared/components/MarketingPublicPageHero';
import { MarketingPublicSectionHeading } from '@/features/guest/marketing/shared/components/MarketingPublicSectionHeading';

const contactCards = [
  {
    icon: Mail,
    title: 'General',
    body: 'Product questions, partnerships, and anything that does not fit the categories below.',
    href: 'mailto:hello@kamehomes.com',
    action: 'Email hello@kamehomes.com',
  },
  {
    icon: Building2,
    title: 'Hosts',
    body: 'Organization setup, onboarding, and questions about host tools.',
    href: 'mailto:hello@kamehomes.com?subject=Host%20support',
    action: 'Email host support',
  },
  {
    icon: Users,
    title: 'Guests',
    body: 'Bookings, documents, check-in, or security-deposit questions for a stay.',
    href: 'mailto:hello@kamehomes.com?subject=Guest%20support',
    action: 'Email guest support',
  },
] as const;

export function ContactPage() {
  return (
    <div className="bg-background min-h-screen">
      <MarketingPublicPageHero
        eyebrow="Contact"
        title="Talk to the team"
        description="Email is the fastest way to reach us. Include your booking ID or organization name when you have one so we can help without back-and-forth."
        blobPosition="right"
      />

      <MarketingPublicPageContent>
        <ul className="grid gap-6 md:grid-cols-3">
          {contactCards.map(({ icon, title, body, href, action }) => (
            <li key={title}>
              <MarketingPublicIconCard
                icon={icon}
                title={title}
                body={body}
                href={href}
                action={action}
              />
            </li>
          ))}
        </ul>

        <div className="border-border bg-muted/40 mt-10 grid gap-8 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <MarketingPublicSectionHeading title="Office" titleClassName="text-xl sm:text-xl" />
            <address className="text-muted-foreground mt-4 space-y-3 text-sm not-italic">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Manila, Philippines</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <a href="mailto:hello@kamehomes.com" className="hover:text-foreground">
                  hello@kamehomes.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <a href="tel:+639123456789" className="hover:text-foreground">
                  +63 912 345 6789
                </a>
              </div>
            </address>
          </div>
          <div>
            <MarketingPublicSectionHeading
              title="Check Support first"
              description="Common booking and hosting answers live on Support. Host product overview is on For Hosts."
              titleClassName="text-xl sm:text-xl"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/support"
                className="border-border bg-background text-foreground hover:bg-muted inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors"
              >
                <LifeBuoy className="h-4 w-4" aria-hidden />
                Open Support
              </Link>
              <Link
                to="/for-hosts"
                className="bg-primary hover:bg-primary/90 inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-colors"
              >
                For hosts
              </Link>
            </div>
          </div>
        </div>
      </MarketingPublicPageContent>
    </div>
  );
}
