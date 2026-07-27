/**
 * list-host-properties — GET all properties across a host's orgs (super admin).
 */

import { createServiceClient, serializeProperty, type PropertyRow } from '../_shared/orgAuth.ts';
import {
  computePropertyListStatsByPropertyId,
  propertyListStatsOrEmpty,
} from '../_shared/propertyListStats.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { verifySuperAdminJwt } from '../_shared/superAdminAuth.ts';

serveAuthenticated('list-host-properties', async (req) => {
  requireHttpMethod(req, 'GET');
  await verifySuperAdminJwt(req);

  const url = new URL(req.url);
  const hostId = url.searchParams.get('hostId')?.trim() ?? '';
  if (!hostId) {
    return jsonError(req, 'hostId is required');
  }

  const supabase = createServiceClient();
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, slug, name')
    .eq('owner_id', hostId);

  if (orgError) {
    console.error('[list-host-properties] orgs', orgError.message);
    throw new Error('Failed to load host organizations');
  }

  const orgRows = orgs ?? [];
  if (orgRows.length === 0) {
    return jsonSuccess(req, { properties: [] });
  }

  const orgById = new Map(orgRows.map((org) => [org.id as string, org]));
  const orgIds = orgRows.map((org) => org.id as string);

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('organization_id', orgIds)
    .order('name', { ascending: true });

  if (error) {
    console.error('[list-host-properties]', error.message);
    throw new Error('Failed to list host properties');
  }

  const properties = (data ?? []) as PropertyRow[];
  const propertyIds = properties.map((row) => row.id);
  let statsByPropertyId = new Map<string, ReturnType<typeof propertyListStatsOrEmpty>>();

  if (propertyIds.length > 0) {
    const { data: bookingRows, error: bookingsError } = await supabase
      .from('guest_submissions')
      .select(
        'property_id, status, check_in_date, check_out_date, number_of_nights, booking_rate, number_of_adults, number_of_children'
      )
      .in('property_id', propertyIds);

    if (bookingsError) {
      console.error('[list-host-properties] bookings', bookingsError.message);
      throw new Error('Failed to load property booking stats');
    }

    statsByPropertyId = computePropertyListStatsByPropertyId(bookingRows ?? []);
  }

  return jsonSuccess(req, {
    properties: properties.map((property) => {
      const org = orgById.get(property.organization_id);
      return {
        ...serializeProperty(property),
        stats: statsByPropertyId.get(property.id) ?? propertyListStatsOrEmpty(),
        organizationSlug: org?.slug ?? '',
        organizationName: org?.name ?? '',
      };
    }),
  });
});
