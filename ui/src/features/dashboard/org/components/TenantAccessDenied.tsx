import { Link } from 'react-router-dom';

import { ShieldX } from 'lucide-react';

import { RequireAdminSignOutButton } from '@/features/dashboard/bookings/components/RequireAdmin';
import { orgPropertiesPath } from '@/features/dashboard/org/lib/tenantPaths';

import { Button } from '@/components/ui/button';

type Props = {
  scope: 'org' | 'property';
  orgSlug?: string;
  orgName?: string;
  propertySlug?: string;
  propertyName?: string;
};

export function TenantAccessDenied({ scope, orgSlug, orgName, propertyName }: Props) {
  const title = scope === 'property' ? 'No property access' : 'No organization access';

  const message =
    scope === 'property'
      ? propertyName
        ? `You don't have access to ${propertyName}.`
        : "You don't have access to this property."
      : orgName
        ? `You don't have access to ${orgName}.`
        : "You don't have access to this organization.";

  const orgFallbackHref = scope === 'property' && orgSlug ? orgPropertiesPath(orgSlug) : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10" role="alert">
      <div className="border-border bg-card w-full max-w-[min(calc(100vw-1.5rem),24rem)] rounded-xl border p-6 text-center">
        <ShieldX className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden />
        <h1 className="text-foreground text-lg font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
        <div className="mt-6 space-y-2">
          {orgFallbackHref ? (
            <Button asChild className="min-h-[44px] w-full">
              <Link to={orgFallbackHref}>Organization properties</Link>
            </Button>
          ) : null}
          <Button
            asChild
            variant={orgFallbackHref ? 'outline' : 'default'}
            className="min-h-[44px] w-full"
          >
            <Link to="/org">Organizations</Link>
          </Button>
          <RequireAdminSignOutButton />
        </div>
      </div>
    </div>
  );
}
