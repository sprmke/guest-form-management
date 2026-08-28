import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

import { HostPublicSocialLinks } from '@/features/guest/marketing/hosts/components/HostPublicSocialLinks';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import {
  formatShowcaseAddress,
  formatShowcaseMapsLink,
} from '@/features/guest/marketing/showcase/lib/showcaseLocation';
import { scrollShowcaseToTop } from '@/features/guest/marketing/showcase/lib/showcaseScroll';
import type { ShowcaseData } from '@/features/guest/marketing/showcase/types/showcase';

import { cn } from '@/lib/utils';

export function ShowcaseFooter({ data }: { data: ShowcaseData }) {
  const { tokens, variant } = useShowcaseTheme();
  const fullAddress = formatShowcaseAddress(data);
  const mapsLink = formatShowcaseMapsLink(data);
  const { guestContact, host } = data;
  const phone = guestContact.contactPhone.trim();
  const email = guestContact.contactEmail.trim();
  const hostLabel = guestContact.contactName || host.ownerName;

  return (
    <footer className={cn('border-t py-12', tokens.footer)}>
      <div className="@lg:grid-cols-3 @sm:px-6 @lg:px-8 mx-auto grid max-w-6xl gap-8 px-4">
        <div className="min-w-0 space-y-3">
          <button
            type="button"
            onClick={() => scrollShowcaseToTop()}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-left"
            aria-label="Back to top"
          >
            {data.logoUrl ? (
              <span
                className={cn('size-10 shrink-0 overflow-hidden rounded-md', tokens.brandLogoBg)}
              >
                <img src={data.logoUrl} alt="" className="size-full object-cover object-center" />
              </span>
            ) : null}
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-base font-semibold',
                  variant === 'editorial' && 'font-cormorant text-xl'
                )}
              >
                {data.propertyName}
              </p>
              <p className={cn('truncate text-sm', tokens.muted)}>{data.locationLabel}</p>
            </div>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Host</p>
          <p className={cn('text-base', tokens.body)}>{hostLabel}</p>
          <p className={cn('text-sm', tokens.muted)}>{host.organizationName}</p>
          {data.hostPublicPath ? (
            <Link
              to={data.hostPublicPath}
              className="text-primary inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
            >
              View host profile
            </Link>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Contact</p>
          {fullAddress ? (
            <p className={cn('flex items-start gap-2 text-sm leading-relaxed', tokens.muted)}>
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {mapsLink ? (
                  <a href={mapsLink} target="_blank" rel="noreferrer" className="hover:underline">
                    {fullAddress}
                  </a>
                ) : (
                  fullAddress
                )}
              </span>
            </p>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className={cn('flex min-h-11 items-center gap-2 text-sm', tokens.body)}
            >
              <Phone className="size-4 shrink-0" aria-hidden />
              {phone}
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className={cn('flex min-h-11 items-center gap-2 text-sm', tokens.body)}
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              {email}
            </a>
          ) : null}
          <Link
            to={data.contactPath}
            className="text-primary inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
          >
            Message host
          </Link>
          <HostPublicSocialLinks links={guestContact.socialLinks} />
        </div>
      </div>
    </footer>
  );
}
