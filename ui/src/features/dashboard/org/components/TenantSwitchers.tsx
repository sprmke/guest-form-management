import { useState, type ReactNode } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { Building2, Car, Check, ChevronDown, Home, Loader2, Plus } from 'lucide-react';

import { AddEntityDialog } from '@/features/dashboard/org/components/AddEntityDialog';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useOptionalParkingContext } from '@/features/dashboard/org/components/RequireParkingContext';
import {
  useAllOrgProperties,
  useOrganizations,
} from '@/features/dashboard/org/hooks/useOrganizations';
import { useOrgSettings } from '@/features/dashboard/org/hooks/useOrgSettings';
import { useAllOrgParkings } from '@/features/dashboard/org/hooks/useParkings';
import {
  canCreateParkingsInOrg,
  canCreatePropertiesInOrg,
  canSelectOrgInSwitcher,
  isPropertyOnlyOrgAccess,
} from '@/features/dashboard/org/lib/orgAccessKind';
import { resolveParkingCompactLabel } from '@/features/dashboard/org/lib/parkingSlotDisplay';
import {
  orgDashboardPath,
  parkingSectionPath,
  propertySectionPath,
  setLastParkingContext,
  setLastTenantContext,
} from '@/features/dashboard/org/lib/tenantPaths';
import type { Organization, Parking, Property } from '@/features/dashboard/org/types';

import { TeamLogoMark } from '@/components/branding/TeamLogoMark';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

type AddEntityTarget = { id: string; slug: string };

/** Menu row — a Radix `DropdownMenuItem` in the desktop dropdown, a plain tappable row in the mobile sheet. */
function SwitcherRow({
  variant,
  onClick,
  className,
  children,
}: {
  variant: 'menu' | 'sheet';
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  if (variant === 'sheet') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'focus-visible:bg-accent active:bg-accent/70 [&>svg]:text-muted-foreground flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-3 text-left text-sm outline-none transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
          className
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <DropdownMenuItem onClick={onClick} className={className}>
      {children}
    </DropdownMenuItem>
  );
}

function SwitcherSeparator({ variant }: { variant: 'menu' | 'sheet' }) {
  if (variant === 'sheet') return <div className="border-border/60 my-1.5 border-t" aria-hidden />;
  return <DropdownMenuSeparator />;
}

function ContextSwitcherMenu({
  organizations,
  byOrgSlug,
  byParkingOrgSlug,
  isLoading,
  currentOrgId,
  currentPropertyId,
  currentParkingId,
  onSelectOrg,
  onSelectProperty,
  onSelectParking,
  onAddEntity,
  variant = 'menu',
}: {
  organizations: Organization[];
  byOrgSlug: Map<string, Property[]>;
  byParkingOrgSlug: Map<string, Parking[]>;
  isLoading: boolean;
  currentOrgId: string | undefined;
  currentPropertyId: string | undefined;
  currentParkingId: string | undefined;
  onSelectOrg: (org: Organization) => void;
  onSelectProperty: (org: Organization, property: Property) => void;
  onSelectParking: (org: Organization, parking: Parking) => void;
  onAddEntity: (org: Organization) => void;
  variant?: 'menu' | 'sheet';
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[4rem] items-center justify-center py-4">
        <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-w-0 overflow-y-auto overflow-x-hidden',
        variant === 'sheet' ? 'max-h-[65vh]' : 'max-h-80'
      )}
    >
      {organizations.map((org, orgIndex) => {
        const properties = byOrgSlug.get(org.slug) ?? [];
        const parkings = byParkingOrgSlug.get(org.slug) ?? [];
        const canSelectOrg = canSelectOrgInSwitcher(org.accessKind);
        const canAdd =
          canSelectOrg &&
          (canCreatePropertiesInOrg(org.accessKind) || canCreateParkingsInOrg(org.accessKind));

        return (
          <div key={org.id}>
            {orgIndex > 0 ? <SwitcherSeparator variant={variant} /> : null}

            <div className="flex min-w-0 items-center gap-1 pr-1">
              {canSelectOrg ? (
                <SwitcherRow
                  variant={variant}
                  onClick={() => onSelectOrg(org)}
                  className="min-w-0 flex-1"
                >
                  <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{org.name}</span>
                  {!currentPropertyId && !currentParkingId && currentOrgId === org.id ? (
                    <Check className="text-primary size-4 shrink-0" aria-hidden />
                  ) : null}
                </SwitcherRow>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm">
                  <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  <span className="text-muted-foreground min-w-0 flex-1 truncate font-medium">
                    {org.name}
                  </span>
                </div>
              )}
              {canAdd ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddEntity(org);
                  }}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                  title={`Add to ${org.name}`}
                  aria-label={`Add to ${org.name}`}
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>

            {properties.map((property) => (
              <SwitcherRow
                key={property.id}
                variant={variant}
                onClick={() => onSelectProperty(org, property)}
                className="pl-8"
              >
                <Home className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{property.name}</span>
                {currentPropertyId === property.id ? (
                  <Check className="text-primary size-4 shrink-0" aria-hidden />
                ) : null}
              </SwitcherRow>
            ))}

            {parkings.map((parking) => (
              <SwitcherRow
                key={parking.id}
                variant={variant}
                onClick={() => onSelectParking(org, parking)}
                className="pl-8"
              >
                <Car className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate" title={parking.name}>
                  {resolveParkingCompactLabel(parking)}
                </span>
                {currentParkingId === parking.id ? (
                  <Check className="text-primary size-4 shrink-0" aria-hidden />
                ) : null}
              </SwitcherRow>
            ))}
          </div>
        );
      })}
    </div>
  );
}

type TenantScopeVariant = 'default' | 'onPrimary';

export function SidebarTenantScope({
  collapsed = false,
  variant = 'default',
}: {
  collapsed?: boolean;
  variant?: TenantScopeVariant;
}) {
  const onPrimary = variant === 'onPrimary';
  const navigate = useNavigate();
  const { orgSlug: routeOrgSlug } = useParams<{ orgSlug?: string }>();
  const tenant = useOptionalOrgContext();
  const parkingTenant = useOptionalParkingContext();
  const { data: orgData } = useOrganizations();
  const { data: orgSettings } = useOrgSettings();
  const organizations = orgData?.organizations ?? [];
  const { byOrgSlug, isLoading: propsLoading } = useAllOrgProperties(organizations);
  const { byOrgSlug: byParkingOrgSlug, isLoading: parkingsLoading } =
    useAllOrgParkings(organizations);
  const isMobileLayout = useIsBelowLg();

  const [isOpen, setIsOpen] = useState(false);
  const [addEntityTarget, setAddEntityTarget] = useState<AddEntityTarget | null>(null);
  const [addEntityOpen, setAddEntityOpen] = useState(false);

  const currentOrg =
    tenant?.org ??
    parkingTenant?.org ??
    organizations.find((org) => org.slug === routeOrgSlug) ??
    organizations[0];

  if (!currentOrg) return null;

  const currentProperty = tenant?.property;
  const currentParking = parkingTenant?.parking;
  const currentOrgProperties = byOrgSlug.get(currentOrg.slug) ?? [];
  const currentOrgParkings = byParkingOrgSlug.get(currentOrg.slug) ?? [];
  const propertyOnlyOrg = isPropertyOnlyOrgAccess(currentOrg.accessKind);
  const showWorkspaceSwitcher =
    !propertyOnlyOrg || currentOrgProperties.length + currentOrgParkings.length > 1;

  const contextLogoUrl = orgSettings?.emailLogoUrl ?? null;

  const display = currentProperty
    ? { primary: currentProperty.name, secondary: currentOrg.name, primaryTitle: undefined }
    : currentParking
      ? {
          primary: resolveParkingCompactLabel(currentParking),
          secondary: currentOrg.name,
          primaryTitle: currentParking.name,
        }
      : { primary: currentOrg.name, secondary: 'Organization', primaryTitle: undefined };

  const handleSelectOrg = (org: Organization) => {
    if (!canSelectOrgInSwitcher(org.accessKind)) return;
    setIsOpen(false);
    navigate(orgDashboardPath(org.slug));
  };

  const handleSelectProperty = (org: Organization, property: Property) => {
    setIsOpen(false);
    navigate(propertySectionPath(org.slug, property.slug, 'dashboard'));
  };

  const handleSelectParking = (org: Organization, parking: Parking) => {
    setIsOpen(false);
    navigate(parkingSectionPath(org.slug, parking.slug, 'dashboard'));
  };

  const handleAddEntity = (org: Organization) => {
    setIsOpen(false);
    setAddEntityTarget({ id: org.id, slug: org.slug });
    setAddEntityOpen(true);
  };

  const menuProps = {
    organizations,
    byOrgSlug,
    byParkingOrgSlug,
    isLoading: propsLoading || parkingsLoading,
    currentOrgId: currentOrg.id,
    currentPropertyId: currentProperty?.id,
    currentParkingId: currentParking?.id,
    onSelectOrg: handleSelectOrg,
    onSelectProperty: handleSelectProperty,
    onSelectParking: handleSelectParking,
    onAddEntity: handleAddEntity,
  };

  const addEntityOrg = addEntityTarget
    ? organizations.find((o) => o.id === addEntityTarget.id)
    : undefined;

  const addDialogs = addEntityTarget ? (
    <AddEntityDialog
      open={addEntityOpen}
      onOpenChange={(open) => {
        setAddEntityOpen(open);
        if (!open) setAddEntityTarget(null);
      }}
      orgId={addEntityTarget.id}
      orgSlug={addEntityTarget.slug}
      orgName={addEntityOrg?.name ?? addEntityTarget.slug}
      canAddProperty={canCreatePropertiesInOrg(addEntityOrg?.accessKind)}
      canAddParking={canCreateParkingsInOrg(addEntityOrg?.accessKind)}
      onPropertyCreated={(property) => {
        setLastTenantContext(addEntityTarget.slug, property.slug);
        navigate(propertySectionPath(addEntityTarget.slug, property.slug, 'dashboard'));
      }}
      onParkingCreated={(parking) => {
        setLastParkingContext(addEntityTarget.slug, parking.slug);
        navigate(parkingSectionPath(addEntityTarget.slug, parking.slug, 'dashboard'));
      }}
    />
  ) : null;

  const contextLogo = (
    <TeamLogoMark
      src={contextLogoUrl}
      alt={display.primary}
      className={cn(
        'shrink-0 shadow-none',
        onPrimary
          ? 'ring-primary-foreground/25 size-11 rounded-full ring-1'
          : 'ring-border/50 size-9 rounded-lg ring-1'
      )}
      imageClassName="object-cover"
    />
  );

  const scopeReadout = (
    <div className="flex min-w-0 items-center gap-3">
      {contextLogo}
      <div className="flex min-w-0 flex-col items-start text-left">
        <span
          className={cn(
            'w-full truncate text-sm font-semibold',
            onPrimary ? 'text-primary-foreground' : undefined
          )}
          title={display.primaryTitle}
        >
          {display.primary}
        </span>
        <span
          className={cn(
            'w-full truncate text-xs',
            onPrimary ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {display.secondary}
        </span>
      </div>
    </div>
  );

  if (!showWorkspaceSwitcher) {
    if (collapsed) {
      return (
        <>
          <div
            className="flex w-full justify-center px-3 py-3"
            aria-label={`${display.primary}, ${display.secondary}`}
          >
            {contextLogo}
          </div>
          {addDialogs}
        </>
      );
    }

    return (
      <>
        <div
          className="flex w-full px-3 py-3"
          aria-label={`${display.primary}, ${display.secondary}`}
        >
          {scopeReadout}
        </div>
        {addDialogs}
      </>
    );
  }

  if (collapsed) {
    return (
      <>
        <div className="flex w-full justify-center">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 overflow-hidden p-0"
                aria-label="Switch workspace"
              >
                {contextLogo}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-64 overflow-hidden">
              <ContextSwitcherMenu {...menuProps} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {addDialogs}
      </>
    );
  }

  const switcherTrigger = (
    <Button
      variant="ghost"
      className={cn(
        'h-auto w-full justify-between px-3 py-3',
        onPrimary &&
          'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
      )}
      aria-label="Switch workspace"
    >
      {scopeReadout}
      <ChevronDown
        className={cn(
          'size-4 shrink-0',
          onPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )}
        aria-hidden
      />
    </Button>
  );

  if (isMobileLayout) {
    return (
      <>
        <BottomSheet open={isOpen} onOpenChange={setIsOpen}>
          <BottomSheetTrigger asChild>{switcherTrigger}</BottomSheetTrigger>
          <BottomSheetContent className="gap-0">
            <BottomSheetHeader className="sr-only">
              <BottomSheetTitle>Switch workspace</BottomSheetTitle>
              <BottomSheetDescription>
                Choose an organization, property, or parking
              </BottomSheetDescription>
            </BottomSheetHeader>
            <ContextSwitcherMenu {...menuProps} variant="sheet" />
          </BottomSheetContent>
        </BottomSheet>
        {addDialogs}
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>{switcherTrigger}</DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden"
          align="start"
        >
          <ContextSwitcherMenu {...menuProps} />
        </DropdownMenuContent>
      </DropdownMenu>
      {addDialogs}
    </>
  );
}

/** @deprecated Use SidebarTenantScope */
export function OrgSwitcher(props: { collapsed?: boolean }) {
  return <SidebarTenantScope {...props} />;
}

/** @deprecated Use SidebarTenantScope */
export function PropertySwitcher(_props: { collapsed?: boolean }) {
  return null;
}
