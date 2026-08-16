import { ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react';

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
    <section id="need-anything" className="scroll-mt-24 px-4 py-10 sm:scroll-mt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <MessageCircle className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-primary text-[11px] font-bold uppercase tracking-[0.2em]">
              One more thing
            </p>
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl dark:text-[#FAFAFA]">
              Need Anything?
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#171717]/10 bg-white p-5 sm:p-8 dark:border-[#FAFAFA]/10 dark:bg-[#0A0A0A]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex items-center gap-4 sm:gap-5 lg:max-w-[220px] lg:flex-col lg:items-center lg:text-center">
              <HostAvatar name={hostName} avatarUrl={avatarUrl} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#737373] dark:text-[#A3A3A3]">
                  Hosted by
                </p>
                <p className="font-fraunces mt-1 text-xl font-semibold tracking-tight text-[#171717] sm:text-2xl dark:text-[#FAFAFA]">
                  {hostName}
                </p>
                {showOrg ? (
                  <p className="mt-1 text-sm font-medium text-[#737373] dark:text-[#A3A3A3]">
                    {orgName}
                  </p>
                ) : null}
              </div>
            </div>

            {hasContact ? (
              <div className="min-w-0 flex-1 border-[#171717]/10 lg:border-l lg:pl-10 dark:border-[#FAFAFA]/10">
                <ul className="grid gap-2.5 sm:grid-cols-2">
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
    </section>
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
        'hover:border-primary/30 group flex min-h-[52px] items-center gap-3 rounded-2xl border border-[#171717]/10 bg-[#F5F5F5] px-4 py-3 transition-colors hover:bg-[#EEEEEE]',
        'dark:border-[#FAFAFA]/10 dark:bg-[#171717] dark:hover:bg-[#1F1F1F]',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
      )}
    >
      <span className="bg-primary/10 text-primary group-hover:bg-primary/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
          {sublabel}
        </span>
        <span className="block truncate text-sm font-semibold text-[#171717] sm:text-base dark:text-[#FAFAFA]">
          {label}
        </span>
      </span>
    </a>
  );
}
