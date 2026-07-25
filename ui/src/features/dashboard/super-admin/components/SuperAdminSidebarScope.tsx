import { useState } from 'react';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Building2, Check, ChevronDown, LayoutDashboard, Loader2, Shield } from 'lucide-react';

import { useOrganizations } from '@/features/dashboard/org/hooks/useOrganizations';
import type { Organization } from '@/features/dashboard/org/types';
import {
  superAdminOrgSlugFromPath,
  superAdminPaths,
} from '@/features/dashboard/super-admin/lib/superAdminPaths';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type SuperAdminSidebarScopeProps = {
  collapsed?: boolean;
};

function SuperAdminOrgMenu({
  organizations,
  isLoading,
  currentOrgSlug,
  onSelectOrg,
  onSelectPlatform,
}: {
  organizations: Organization[];
  isLoading: boolean;
  currentOrgSlug: string | null;
  onSelectOrg: (org: Organization) => void;
  onSelectPlatform: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[4rem] items-center justify-center py-4">
        <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="max-h-80 min-w-0 overflow-y-auto overflow-x-hidden">
      <DropdownMenuItem onClick={onSelectPlatform} className="flex items-center gap-2 py-2">
        <LayoutDashboard className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">Platform overview</span>
        {!currentOrgSlug ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : null}
      </DropdownMenuItem>

      {organizations.length > 0 ? <DropdownMenuSeparator /> : null}

      {organizations.map((org) => (
        <DropdownMenuItem
          key={org.id}
          onClick={() => onSelectOrg(org)}
          className="flex items-center gap-2 py-2"
        >
          <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{org.name}</span>
          {currentOrgSlug === org.slug ? (
            <Check className="text-primary size-4 shrink-0" aria-hidden />
          ) : null}
        </DropdownMenuItem>
      ))}
    </div>
  );
}

export function SuperAdminSidebarScope({ collapsed = false }: SuperAdminSidebarScopeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgSlug: routeOrgSlug } = useParams<{ orgSlug?: string }>();
  const { data, isLoading } = useOrganizations();
  const organizations = data?.organizations ?? [];
  const [isOpen, setIsOpen] = useState(false);

  const currentOrgSlug = routeOrgSlug ?? superAdminOrgSlugFromPath(location.pathname) ?? null;
  const currentOrg = organizations.find((org) => org.slug === currentOrgSlug) ?? null;

  const handleSelectOrg = (org: Organization) => {
    setIsOpen(false);
    navigate(superAdminPaths.orgProperties(org.slug));
  };

  const handleSelectPlatform = () => {
    setIsOpen(false);
    navigate(superAdminPaths.root);
  };

  const menuProps = {
    organizations,
    isLoading,
    currentOrgSlug,
    onSelectOrg: handleSelectOrg,
    onSelectPlatform: handleSelectPlatform,
  };

  const scopeIcon = (
    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
      <Shield className="h-5 w-5" aria-hidden />
    </div>
  );

  const scopeReadout = (
    <div className="flex min-w-0 items-center gap-3">
      {scopeIcon}
      <div className="flex min-w-0 flex-col items-start text-left">
        <span className="text-sidebar-foreground w-full truncate text-sm font-semibold">
          {currentOrg?.name ?? 'Select organization'}
        </span>
        <span className="text-sidebar-muted w-full truncate text-xs">Super Admin</span>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div className="flex w-full justify-center">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              aria-label="Switch organization"
            >
              {scopeIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64 overflow-hidden">
            <SuperAdminOrgMenu {...menuProps} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'hover:bg-muted/60 h-auto w-full justify-between rounded-xl px-2 py-2',
            'text-sidebar-foreground'
          )}
          aria-label="Switch organization"
        >
          {scopeReadout}
          <ChevronDown className="text-sidebar-muted size-4 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(calc(100vw-24px),16rem)] overflow-hidden"
      >
        <SuperAdminOrgMenu {...menuProps} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
