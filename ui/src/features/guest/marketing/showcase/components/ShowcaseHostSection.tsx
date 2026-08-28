import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

import { HostPublicSocialLinks } from '@/features/guest/marketing/hosts/components/HostPublicSocialLinks';
import { ShowcaseReveal } from '@/features/guest/marketing/showcase/components/ShowcaseMotion';
import { useShowcaseStyle } from '@/features/guest/marketing/showcase/components/ShowcaseStyleProvider';
import { useShowcaseTheme } from '@/features/guest/marketing/showcase/components/ShowcaseThemeProvider';
import { resolveShowcaseMotionReduced } from '@/features/guest/marketing/showcase/lib/showcaseStyleConfig';
import type {
  ShowcaseData,
  ShowcaseResolvedSection,
} from '@/features/guest/marketing/showcase/types/showcase';

import { cn } from '@/lib/utils';

type Props = {
  data: ShowcaseData;
  section: ShowcaseResolvedSection;
  headingClassName?: string;
};

export function ShowcaseHostSection({ data, section, headingClassName }: Props) {
  const { tokens } = useShowcaseTheme();
  const { displayFontClass } = useShowcaseStyle();
  const motionReduced = resolveShowcaseMotionReduced(data.config, data.reducedMotion, data.embed);
  const { host, guestContact } = data;
  const avatar = host.ownerAvatarUrl || host.organizationLogoUrl;
  const displayName = guestContact.contactName || host.ownerName;
  const phone = guestContact.contactPhone.trim();
  const email = guestContact.contactEmail.trim();

  return (
    <section
      id={section.id}
      data-page-editor-anchor={section.id}
      className="@sm:py-24 scroll-mt-20 py-16"
    >
      <div className="@sm:px-6 @lg:px-8 mx-auto max-w-6xl px-4">
        <ShowcaseReveal reduced={motionReduced}>
          <h2
            className={cn(
              displayFontClass,
              headingClassName ?? '@sm:text-4xl text-3xl font-semibold tracking-tight'
            )}
          >
            {section.heading}
          </h2>
        </ShowcaseReveal>

        <div className="@lg:grid-cols-[auto,1fr] @lg:gap-10 mt-6 grid grid-cols-1 gap-6">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className={cn('size-24 shrink-0 rounded-2xl object-cover', tokens.brandLogoBg)}
            />
          ) : (
            <span
              className={cn(
                'inline-flex size-24 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold',
                tokens.brandFallback
              )}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-lg font-medium">{displayName}</p>
              <p className={cn('text-base', tokens.muted)}>{host.organizationName}</p>
              {host.verifiedBadge ? (
                <p className="text-primary mt-1 text-sm font-medium">Verified host</p>
              ) : null}
            </div>

            {section.body ? (
              <p className={cn('max-w-2xl text-base leading-relaxed', tokens.body)}>
                {section.body}
              </p>
            ) : section.subheading ? (
              <p className={cn('max-w-2xl text-base leading-relaxed', tokens.body)}>
                {section.subheading}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium',
                    tokens.secondaryBtn
                  )}
                >
                  <Phone className="size-4" aria-hidden />
                  {phone}
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium',
                    tokens.secondaryBtn
                  )}
                >
                  <Mail className="size-4" aria-hidden />
                  {email}
                </a>
              ) : null}
              {data.hostPublicPath ? (
                <Link
                  to={data.hostPublicPath}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium',
                    tokens.primaryBtn
                  )}
                >
                  View host
                </Link>
              ) : null}
              <Link
                to={data.contactPath}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium',
                  tokens.secondaryBtn
                )}
              >
                Contact
              </Link>
            </div>

            <HostPublicSocialLinks links={guestContact.socialLinks} />
          </div>
        </div>
      </div>
    </section>
  );
}
