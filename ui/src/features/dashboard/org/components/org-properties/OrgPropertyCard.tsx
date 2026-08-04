import { Link, useNavigate } from 'react-router-dom';

import {
  Bath,
  Bed,
  Building2,
  Calendar,
  Copy,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Settings,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { OrgPropertyImageCarousel } from '@/features/dashboard/org/components/org-properties/OrgPropertyImageCarousel';
import { OrgPropertyStatusBadge } from '@/features/dashboard/org/components/org-properties/OrgPropertyStatusBadge';
import { absoluteGuestCalendarUrl } from '@/features/dashboard/org/lib/guestPublicPaths';
import { orgPropertyCardModel } from '@/features/dashboard/org/lib/orgPropertyCardModel';
import {
  formatOrgPropertyCurrency,
  orgPropertyStatsOrEmpty,
  orgPropertyTypeIcon,
} from '@/features/dashboard/org/lib/orgPropertyDisplay';
import { propertySectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { Property } from '@/features/dashboard/org/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ORG_PROPERTY_CARD_CLASS =
  'relative block rounded-xl border border-border/50 bg-card text-card-foreground shadow-card overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-lg dark:border-[hsl(0_0%_100%_/_0.06)]';

const ORG_PROPERTY_CARD_LINK_CLASS =
  'absolute inset-0 z-[1] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type Props = {
  property: Property;
  orgSlug: string;
  hideStats?: boolean;
  organizationName?: string | null;
  developmentName?: string | null;
  developmentHref?: string | null;
};

async function copyGuestLink(propertySlug: string) {
  try {
    await navigator.clipboard.writeText(absoluteGuestCalendarUrl(propertySlug));
    toast.success('Guest calendar link copied');
  } catch {
    toast.error('Could not copy link');
  }
}

function OrgPropertyDetailChips({
  bedrooms,
  bathrooms,
  maxGuests,
}: {
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
}) {
  if (!bedrooms && !bathrooms && !maxGuests) return null;

  return (
    <div className="text-foreground flex flex-wrap gap-3 text-sm">
      {bedrooms ? (
        <div className="inline-flex items-center gap-1.5">
          <Bed className="text-muted-foreground size-4" aria-hidden />
          <span>
            {bedrooms} {bedrooms === 1 ? 'Bed' : 'Beds'}
          </span>
        </div>
      ) : null}
      {bathrooms ? (
        <div className="inline-flex items-center gap-1.5">
          <Bath className="text-muted-foreground size-4" aria-hidden />
          <span>
            {bathrooms} {bathrooms === 1 ? 'Bath' : 'Baths'}
          </span>
        </div>
      ) : null}
      {maxGuests ? (
        <div className="inline-flex items-center gap-1.5">
          <Users className="text-muted-foreground size-4" aria-hidden />
          <span>{maxGuests} Guests</span>
        </div>
      ) : null}
    </div>
  );
}

function OrgPropertyPlatformContext({
  organizationName,
  developmentName,
  developmentHref,
  residenceName,
}: {
  organizationName?: string | null;
  developmentName?: string | null;
  developmentHref?: string | null;
  residenceName?: string | null;
}) {
  const residence = developmentName?.trim() || residenceName?.trim() || null;
  if (!organizationName?.trim() && !residence) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
      {organizationName?.trim() ? (
        <span className="truncate">{organizationName.trim()}</span>
      ) : null}
      {organizationName?.trim() && residence ? <span aria-hidden>·</span> : null}
      {developmentHref && developmentName ? (
        <Link
          to={developmentHref}
          className="text-primary pointer-events-auto relative z-[3] truncate hover:underline"
        >
          {developmentName}
        </Link>
      ) : residence ? (
        <span className="truncate">{residence}</span>
      ) : null}
    </div>
  );
}

function OrgPropertyStatsRow({ property }: { property: Property }) {
  const stats = orgPropertyStatsOrEmpty(property);

  return (
    <div className="border-border/50 border-t pt-2.5 sm:pt-3">
      <div className="grid grid-cols-3 gap-1 text-center sm:gap-2 sm:text-sm">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] sm:text-xs">Bookings</p>
          <p className="text-foreground text-xs font-semibold tabular-nums sm:text-sm">
            {stats.activeBookings}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] sm:text-xs">Revenue</p>
          <p className="text-foreground truncate text-xs font-semibold tabular-nums sm:text-sm">
            {formatOrgPropertyCurrency(stats.monthlyRevenue)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] sm:text-xs">Occupancy</p>
          <p className="text-foreground text-xs font-semibold tabular-nums sm:text-sm">
            {stats.occupancyRate}%
          </p>
        </div>
      </div>
    </div>
  );
}

function OrgPropertyActionsMenu({
  property,
  dashboardHref,
  settingsHref,
  guestHref,
}: {
  property: Property;
  dashboardHref: string;
  settingsHref: string;
  guestHref: string;
}) {
  const model = orgPropertyCardModel(property);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="bg-background/90 size-8 shadow-sm backdrop-blur-sm"
          aria-label={`Actions for ${model.title}`}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{model.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={dashboardHref}>
            <Calendar className="size-4" aria-hidden />
            Open dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={settingsHref}>
            <Settings className="size-4" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={guestHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden />
            Guest calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void copyGuestLink(property.slug);
          }}
        >
          <Copy className="size-4" aria-hidden />
          Copy guest link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrgPropertyCard({
  property,
  orgSlug,
  hideStats = false,
  organizationName,
  developmentName,
  developmentHref,
}: Props) {
  const navigate = useNavigate();
  const model = orgPropertyCardModel(property);
  const TypeIcon = orgPropertyTypeIcon(property.type);
  const dashboardHref = propertySectionPath(orgSlug, property.slug, 'dashboard');
  const settingsHref = propertySectionPath(orgSlug, property.slug, 'settings');
  const guestHref = absoluteGuestCalendarUrl(property.slug);

  return (
    <article className={`${ORG_PROPERTY_CARD_CLASS} group`}>
      <Link
        to={dashboardHref}
        className={ORG_PROPERTY_CARD_LINK_CLASS}
        aria-label={`Open ${model.title}`}
      />

      <div className="relative z-[2]">
        <OrgPropertyImageCarousel
          images={model.imageUrls}
          name={model.title}
          className="rounded-t-xl"
          onSurfaceClick={() => navigate(dashboardHref)}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <OrgPropertyStatusBadge status={property.status} />
        </div>
        <div className="absolute right-3 top-3 z-[3] opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <OrgPropertyActionsMenu
            property={property}
            dashboardHref={dashboardHref}
            settingsHref={settingsHref}
            guestHref={guestHref}
          />
        </div>
      </div>

      <div className="pointer-events-none relative z-[2] space-y-2.5 p-3 sm:space-y-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-foreground group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors sm:text-base lg:text-lg">
            {model.title}
          </p>
          {model.subtitle ? (
            <p className="text-muted-foreground line-clamp-1 text-sm">{model.subtitle}</p>
          ) : null}
          <OrgPropertyPlatformContext
            organizationName={organizationName}
            developmentName={developmentName}
            developmentHref={developmentHref}
            residenceName={property.residenceName}
          />
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <TypeIcon className="size-4 shrink-0" aria-hidden />
            <span>{model.typeLabel}</span>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="line-clamp-1">{model.locationLine}</span>
        </div>

        <OrgPropertyDetailChips
          bedrooms={model.bedrooms}
          bathrooms={model.bathrooms}
          maxGuests={model.maxGuests}
        />

        {hideStats ? null : <OrgPropertyStatsRow property={property} />}
      </div>
    </article>
  );
}

export function OrgPropertyListRow({
  property,
  orgSlug,
  hideStats = false,
  organizationName,
  developmentName,
  developmentHref,
}: Props) {
  const navigate = useNavigate();
  const model = orgPropertyCardModel(property);
  const TypeIcon = orgPropertyTypeIcon(property.type);
  const stats = orgPropertyStatsOrEmpty(property);
  const dashboardHref = propertySectionPath(orgSlug, property.slug, 'dashboard');
  const settingsHref = propertySectionPath(orgSlug, property.slug, 'settings');
  const guestHref = absoluteGuestCalendarUrl(property.slug);

  return (
    <article className={`${ORG_PROPERTY_CARD_CLASS} group`}>
      <Link
        to={dashboardHref}
        className={ORG_PROPERTY_CARD_LINK_CLASS}
        aria-label={`Open ${model.title}`}
      />

      <div className="relative z-[2] flex flex-col gap-4 p-4 sm:flex-row">
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-44 sm:w-52">
          <OrgPropertyImageCarousel
            images={model.imageUrls}
            name={model.title}
            className="aspect-auto size-full rounded-xl"
            onSurfaceClick={() => navigate(dashboardHref)}
          />
          <div className="pointer-events-none absolute left-2 top-2 z-10">
            <OrgPropertyStatusBadge status={property.status} />
          </div>
        </div>

        <div className="pointer-events-none flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-foreground group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors sm:text-base lg:text-lg">
                  {model.title}
                </p>
                {model.subtitle ? (
                  <p className="text-muted-foreground line-clamp-1 text-sm">{model.subtitle}</p>
                ) : null}
                <OrgPropertyPlatformContext
                  organizationName={organizationName}
                  developmentName={developmentName}
                  developmentHref={developmentHref}
                  residenceName={property.residenceName}
                />
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <TypeIcon className="size-3.5 shrink-0" aria-hidden />
                    {model.typeLabel}
                  </span>
                  <span className="text-border hidden sm:inline" aria-hidden>
                    •
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="line-clamp-1">{model.locationLine}</span>
                  </span>
                </div>
              </div>

              <div className="pointer-events-auto relative z-[3] shrink-0">
                <OrgPropertyActionsMenu
                  property={property}
                  dashboardHref={dashboardHref}
                  settingsHref={settingsHref}
                  guestHref={guestHref}
                />
              </div>
            </div>

            {model.description ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{model.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <OrgPropertyDetailChips
              bedrooms={model.bedrooms}
              bathrooms={model.bathrooms}
              maxGuests={model.maxGuests}
            />

            {hideStats ? null : (
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bookings: </span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {stats.activeBookings}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue: </span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {formatOrgPropertyCurrency(stats.monthlyRevenue)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Occupancy: </span>
                  <span className="text-foreground font-semibold tabular-nums">
                    {stats.occupancyRate}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrgPropertiesEmptyState({
  filtered,
  canAdd = false,
  onAdd,
}: {
  filtered: boolean;
  canAdd?: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center sm:py-16">
      <div className="icon-well-sm inline-flex items-center justify-center">
        <Building2 className="text-muted-foreground size-5" aria-hidden />
      </div>
      <p className="text-foreground text-sm font-semibold">
        {filtered ? 'No properties found' : 'No properties yet'}
      </p>
      {!filtered && canAdd ? (
        <Button type="button" onClick={onAdd} className="min-h-[44px]">
          Add property
        </Button>
      ) : null}
    </div>
  );
}
