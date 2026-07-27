/**
 * list-platform-properties — GET all properties across every org (super admin).
 */

import { createServiceClient, serializeProperty, type PropertyRow } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

function developmentLookupByName(
  rows: { name: string; slug: string }[]
): Map<string, { name: string; slug: string }> {
  const map = new Map<string, { name: string; slug: string }>();
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (key) map.set(key, row);
  }
  return map;
}

serveAuthenticated('list-platform-properties', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const supabase = createServiceClient();

  const [
    { data: orgs, error: orgError },
    { data: properties, error: propertyError },
    { data: developments, error: developmentError },
  ] = await Promise.all([
    supabase.from('organizations').select('id, slug, name').order('name', { ascending: true }),
    supabase.from('properties').select('*').order('name', { ascending: true }),
    supabase.from('developments').select('name, slug'),
  ]);

  if (orgError) {
    console.error('[list-platform-properties] orgs', orgError.message);
    throw new Error('Failed to load organizations');
  }
  if (propertyError) {
    console.error('[list-platform-properties] properties', propertyError.message);
    throw new Error('Failed to list properties');
  }
  if (developmentError) {
    console.error('[list-platform-properties] developments', developmentError.message);
    throw new Error('Failed to load developments');
  }

  const orgById = new Map((orgs ?? []).map((org) => [org.id as string, org]));
  const developmentByName = developmentLookupByName(
    (developments ?? []).map((row) => ({
      name: row.name as string,
      slug: row.slug as string,
    }))
  );

  const propertyRows = (properties ?? []) as PropertyRow[];

  return jsonSuccess(req, {
    properties: propertyRows.map((property) => {
      const org = orgById.get(property.organization_id);
      const residenceKey = property.residence_name?.trim().toLowerCase() ?? '';
      const development = residenceKey ? developmentByName.get(residenceKey) : undefined;

      return {
        ...serializeProperty(property),
        organizationSlug: org?.slug ?? '',
        organizationName: org?.name ?? '',
        developmentSlug: development?.slug ?? null,
        developmentName: development?.name ?? null,
      };
    }),
  });
});
