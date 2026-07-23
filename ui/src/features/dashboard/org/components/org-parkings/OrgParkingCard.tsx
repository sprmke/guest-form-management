import { Link, useNavigate } from 'react-router-dom';

import {
  Calendar,
  Car,
  Copy,
  ExternalLink,
  Hash,
  Layers,
  MapPin,
  MoreHorizontal,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

import { OrgPropertyImageCarousel } from '@/features/dashboard/org/components/org-properties/OrgPropertyImageCarousel';
import { OrgPropertyStatusBadge } from '@/features/dashboard/org/components/org-properties/OrgPropertyStatusBadge';
import { absoluteGuestParkingUrl } from '@/features/dashboard/org/lib/guestPublicPaths';
import { orgParkingCardModel } from '@/features/dashboard/org/lib/orgParkingCardModel';
import {
  formatOrgParkingCurrency,
  orgParkingStatsOrEmpty,
  orgParkingTypeIcon,
} from '@/features/dashboard/org/lib/orgParkingDisplay';
import { parkingSectionPath } from '@/features/dashboard/org/lib/tenantPaths';
import type { Parking } from '@/features/dashboard/org/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ORG_PARKING_CARD_CLASS =
  'relative block rounded-xl border border-border/50 bg-card text-card-foreground shadow-card overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-lg dark:border-[hsl(0_0%_100%_/_0.06)]';

const ORG_PARKING_CARD_LINK_CLASS =
  'absolute inset-0 z-[1] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type Props = {
  parking: Parking;
  orgSlug: string;
};

async function copyPublicLink(parkingSlug: string) {
  try {
    await navigator.clipboard.writeText(absoluteGuestParkingUrl(parkingSlug));
    toast.success('Public parking link copied');
  } catch {
    toast.error('Could not copy link');
  }
}

function OrgParkingDetailChips({
  tower,
  level,
  slotLabel,
}: {
  tower: string | null;
  level: string | null;
  slotLabel: string;
}) {
  if (!tower && !level && !slotLabel) return null;

  return (
    <div className="text-foreground flex flex-wrap gap-3 text-sm">
      {tower ? (
        <div className="inline-flex items-center gap-1.5">
          <MapPin className="text-muted-foreground size-4" aria-hidden />
          <span>{tower}</span>
        </div>
      ) : null}
      {level ? (
        <div className="inline-flex items-center gap-1.5">
          <Layers className="text-muted-foreground size-4" aria-hidden />
          <span>{level}</span>
        </div>
      ) : null}
      {slotLabel ? (
        <div className="inline-flex items-center gap-1.5">
          <Hash className="text-muted-foreground size-4" aria-hidden />
          <span>Slot {slotLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function OrgParkingStatsRow({ parking }: { parking: Parking }) {
  const stats = orgParkingStatsOrEmpty(parking);

  return (
    <div className="border-border/50 border-t pt-2.5 sm:pt-3">
      <div className="grid grid-cols-3 gap-1 text-center sm:gap-2 sm:text-sm">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] sm:text-xs">Reservations</p>
          <p className="text-foreground text-xs font-semibold tabular-nums sm:text-sm">
            {stats.activeReservations}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] sm:text-xs">Revenue</p>
          <p className="text-foreground truncate text-xs font-semibold tabular-nums sm:text-sm">
            {formatOrgParkingCurrency(stats.monthlyRevenue)}
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

function OrgParkingActionsMenu({
  model,
  dashboardHref,
  settingsHref,
  publicHref,
  parkingSlug,
}: {
  model: ReturnType<typeof orgParkingCardModel>;
  dashboardHref: string;
  settingsHref: string;
  publicHref: string;
  parkingSlug: string;
}) {
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
        <DropdownMenuLabel>{model.subtitle ?? model.title}</DropdownMenuLabel>
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
          <a href={publicHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden />
            View parking
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void copyPublicLink(parkingSlug);
          }}
        >
          <Copy className="size-4" aria-hidden />
          Copy public link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrgParkingCard({ parking, orgSlug }: Props) {
  const navigate = useNavigate();
  const model = orgParkingCardModel(parking);
  const TypeIcon = orgParkingTypeIcon(parking.parkingType);
  const dashboardHref = parkingSectionPath(orgSlug, parking.slug, 'dashboard');
  const settingsHref = parkingSectionPath(orgSlug, parking.slug, 'settings');
  const publicHref = absoluteGuestParkingUrl(parking.slug);

  return (
    <article className={`${ORG_PARKING_CARD_CLASS} group`}>
      <Link
        to={dashboardHref}
        className={ORG_PARKING_CARD_LINK_CLASS}
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
          <OrgPropertyStatusBadge status={parking.status} />
        </div>
        <div className="absolute right-3 top-3 z-[3] opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <OrgParkingActionsMenu
            model={model}
            dashboardHref={dashboardHref}
            settingsHref={settingsHref}
            publicHref={publicHref}
            parkingSlug={parking.slug}
          />
        </div>
      </div>

      <div className="pointer-events-none relative z-[2] space-y-2.5 p-3 sm:space-y-3 sm:p-4">
        <div className="min-w-0 space-y-1">
          <p className="text-foreground group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors sm:text-base lg:text-lg">
            {model.title}
          </p>
          {model.subtitle ? (
            <p className="text-muted-foreground font-mono text-xs tabular-nums sm:text-sm">
              {model.subtitle}
            </p>
          ) : null}
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <TypeIcon className="size-4 shrink-0" aria-hidden />
            <span>{model.typeLabel}</span>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="line-clamp-1">{model.locationLine}</span>
        </div>

        <OrgParkingDetailChips
          tower={model.tower}
          level={model.level}
          slotLabel={model.slotLabel}
        />

        <OrgParkingStatsRow parking={parking} />
      </div>
    </article>
  );
}

export function OrgParkingListRow({ parking, orgSlug }: Props) {
  const navigate = useNavigate();
  const model = orgParkingCardModel(parking);
  const TypeIcon = orgParkingTypeIcon(parking.parkingType);
  const stats = orgParkingStatsOrEmpty(parking);
  const dashboardHref = parkingSectionPath(orgSlug, parking.slug, 'dashboard');
  const settingsHref = parkingSectionPath(orgSlug, parking.slug, 'settings');
  const publicHref = absoluteGuestParkingUrl(parking.slug);

  return (
    <article className={`${ORG_PARKING_CARD_CLASS} group`}>
      <Link
        to={dashboardHref}
        className={ORG_PARKING_CARD_LINK_CLASS}
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
            <OrgPropertyStatusBadge status={parking.status} />
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
                  <p className="text-muted-foreground font-mono text-xs tabular-nums sm:text-sm">
                    {model.subtitle}
                  </p>
                ) : null}
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
                <OrgParkingActionsMenu
                  model={model}
                  dashboardHref={dashboardHref}
                  settingsHref={settingsHref}
                  publicHref={publicHref}
                  parkingSlug={parking.slug}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <OrgParkingDetailChips
              tower={model.tower}
              level={model.level}
              slotLabel={model.slotLabel}
            />

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Reservations: </span>
                <span className="text-foreground font-semibold tabular-nums">
                  {stats.activeReservations}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue: </span>
                <span className="text-foreground font-semibold tabular-nums">
                  {formatOrgParkingCurrency(stats.monthlyRevenue)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Occupancy: </span>
                <span className="text-foreground font-semibold tabular-nums">
                  {stats.occupancyRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function OrgParkingsEmptyState({
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
      <div className="icon-well-sm">
        <Car className="text-muted-foreground size-5" aria-hidden />
      </div>
      <p className="text-foreground text-sm font-semibold">
        {filtered ? 'No parkings found' : 'No parkings yet'}
      </p>
      {!filtered && canAdd ? (
        <Button type="button" onClick={onAdd} className="min-h-[44px]">
          Add parking
        </Button>
      ) : null}
    </div>
  );
}
