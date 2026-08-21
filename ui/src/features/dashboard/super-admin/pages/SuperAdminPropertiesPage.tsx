import { useParams } from 'react-router-dom';

import { useOrganizations, useProperties } from '@/features/dashboard/org/hooks/useOrganizations';

import { Skeleton } from '@/components/ui/skeleton';

export function SuperAdminPropertiesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: orgData } = useOrganizations();
  const org = orgData?.organizations.find((item) => item.slug === orgSlug);
  const { data: propertiesData, isLoading, error } = useProperties(orgSlug);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-admin-page-title sm:text-xl">
        {org?.name ? `${org.name} — Properties` : 'Properties'}
      </h1>

      {isLoading ? (
        <ul
          className="divide-border border-border divide-y rounded-xl border"
          aria-busy="true"
          aria-label="Loading properties"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="px-4 py-3" style={{ opacity: 1 - i * 0.08 }}>
              <Skeleton className="h-3.5 w-1/3 max-w-full" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="text-destructive text-sm">Could not load properties.</p>
      ) : propertiesData?.properties.length ? (
        <ul className="divide-border border-border divide-y rounded-xl border">
          {propertiesData.properties.map((property) => (
            <li key={property.id} className="px-4 py-3 text-sm">
              {property.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No properties yet.</p>
      )}
    </div>
  );
}
