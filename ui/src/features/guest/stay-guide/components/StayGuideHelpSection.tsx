import { ExternalLink, Mail, Phone } from 'lucide-react';

import type { GuestStayGuideDto } from '@/features/guest/stay-guide/lib/api';

import { cn } from '@/lib/utils';
import { formatPhilippineMobileDisplay } from '@/lib/validation/fieldValidation';

interface StayGuideHelpSectionProps {
  host: GuestStayGuideDto['host'];
  contact: GuestStayGuideDto['contact'];
}

export function StayGuideHelpSection({ host, contact }: StayGuideHelpSectionProps) {
  const phone = contact.phone.trim();
  const email = contact.email.trim();
  const facebookUrl = contact.facebookUrl.trim();
  const airbnbUrl = contact.airbnbUrl.trim();
  const hostName = host.name.trim();
  const orgName = host.organizationName.trim();
  const showOrg = orgName.length > 0 && orgName !== hostName;

  const hasContact = phone || email || facebookUrl || airbnbUrl;
  if (!hostName && !hasContact) return null;

  const displayPhone = phone ? formatPhilippineMobileDisplay(phone) : '';
  const avatarUrl = host.avatarUrl?.trim() || null;

  return (
    <footer className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            'border-border/60 bg-card overflow-hidden rounded-3xl border shadow-lg',
            'from-primary/[0.06] via-card to-card bg-gradient-to-br'
          )}
        >
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
              <div className="flex items-center gap-4 sm:gap-5 lg:max-w-[220px] lg:flex-col lg:items-center lg:text-center">
                <HostAvatar name={hostName} avatarUrl={avatarUrl} />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
                    Hosted by
                  </p>
                  <p className="text-foreground mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                    {hostName}
                  </p>
                  {showOrg ? (
                    <p className="text-muted-foreground mt-1 text-sm font-medium">{orgName}</p>
                  ) : null}
                </div>
              </div>

              {hasContact ? (
                <div className="lg:border-border/50 min-w-0 flex-1 lg:border-l lg:pl-10">
                  <h2 className="text-primary text-xl font-semibold tracking-tight sm:text-2xl">
                    Need help?
                  </h2>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {phone ? (
                      <li className="sm:col-span-2">
                        <ContactAction
                          href={`tel:${phone.replace(/\s/g, '')}`}
                          icon={Phone}
                          label={displayPhone || phone}
                          sublabel="Call"
                        />
                      </li>
                    ) : null}
                    {email ? (
                      <li className="sm:col-span-2">
                        <ContactAction
                          href={`mailto:${email}`}
                          icon={Mail}
                          label={email}
                          sublabel="Email"
                        />
                      </li>
                    ) : null}
                    {facebookUrl ? (
                      <li>
                        <ContactAction
                          href={facebookUrl}
                          icon={ExternalLink}
                          label="Facebook"
                          sublabel="Message"
                          external
                        />
                      </li>
                    ) : null}
                    {airbnbUrl ? (
                      <li>
                        <ContactAction
                          href={airbnbUrl}
                          icon={ExternalLink}
                          label="Airbnb"
                          sublabel="Message"
                          external
                        />
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function HostAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initial = name.charAt(0).toUpperCase() || 'H';

  return (
    <div
      className={cn(
        'ring-primary/15 bg-muted relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full ring-4',
        'sm:h-24 sm:w-24'
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span
          className="bg-primary/15 text-primary flex size-full items-center justify-center text-2xl font-bold sm:text-3xl"
          aria-hidden
        >
          {initial}
        </span>
      )}
    </div>
  );
}

function ContactAction({
  href,
  icon: Icon,
  label,
  sublabel,
  external = false,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  sublabel: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        'border-border/60 bg-background/80 hover:border-primary/30 hover:bg-background group flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
      )}
    >
      <span className="bg-primary/10 text-primary group-hover:bg-primary/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wider">
          {sublabel}
        </span>
        <span className="text-foreground block truncate text-sm font-semibold sm:text-base">
          {label}
        </span>
      </span>
    </a>
  );
}
